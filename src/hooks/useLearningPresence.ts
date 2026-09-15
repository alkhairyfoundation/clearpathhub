'use client';

import { useCallback, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import {
  HEARTBEAT_MS,
  IDLE_AFTER_MS,
  SIGNAL_WINDOW_MS,
  type PresenceActivityType,
  type PresenceSignal,
  type PresenceSignalType,
  addSignal,
} from '@/lib/presence';

export type PlayerState = 'playing' | 'paused' | 'buffering' | 'unavailable' | null;

function fire(p: PromiseLike<unknown>) {
  Promise.resolve(p).then(() => {}).catch(() => {});
}

export interface UseLearningPresenceOptions {
  active: boolean;
  userId?: string | null;
  activityType?: PresenceActivityType;
  contentId?: string | null;
  contentTitle?: string | null;
  progress?: number;
  getProgress?: () => number | null;
  getPlayerState?: () => PlayerState;
}

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useLearningPresence(options: UseLearningPresenceOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const signalsRef = useRef<PresenceSignal[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const lastEventAtRef = useRef<Record<string, number>>({});
  const lastIdleSignalAtRef = useRef<number>(0);
  const lastPausedSignalAtRef = useRef<number>(0);
  const lastProgressAtRef = useRef<number>(0);
  const noProgressBeatsRef = useRef<number>(0);
  const studySessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const clientIdRef = useRef<string>(makeClientId());
  const runningRef = useRef(false);

  const pushSignal = useCallback((t: PresenceSignalType, detail?: string) => {
    const now = Date.now();
    const last = lastEventAtRef.current[t] || 0;
    if (now - last < 2000) return;
    lastEventAtRef.current[t] = now;
    signalsRef.current = addSignal(signalsRef.current, t, detail, now);
    const studentId = optsRef.current.userId;
    if (!studentId) return;
    fire(
      db
        .from('learning_events')
        .insert({
          student_id: studentId,
          event_type: t,
          detail: detail || null,
          activity_type: optsRef.current.activityType || 'video',
          content_id: optsRef.current.contentId || null,
        })
    );
  }, []);

  const endStudySession = useCallback(() => {
    const id = studySessionIdRef.current;
    studySessionIdRef.current = null;
    const studentId = optsRef.current.userId;
    if (!studentId) return;
    if (id) {
      fire(
        db
          .from('study_sessions')
          .update({ ended_at: new Date().toISOString(), signals_count: signalsRef.current.length })
          .eq('id', id)
      );
    }
    fire(
      db
        .from('learning_events')
        .insert({
          student_id: studentId,
          event_type: 'presence_end',
          activity_type: optsRef.current.activityType || 'video',
          content_id: optsRef.current.contentId || null,
        })
    );
  }, []);

  const heartbeat = useCallback(() => {
    const opts = optsRef.current;
    const studentId = opts.userId;
    if (!studentId) return;
    const now = Date.now();

    let signals = signalsRef.current;
    const cutoff = now - SIGNAL_WINDOW_MS * 3;
    if (signals.some((s) => s.ts < cutoff)) {
      signals = signals.filter((s) => s.ts >= cutoff);
      signalsRef.current = signals;
    }

    const playerState = opts.getPlayerState ? opts.getPlayerState() : null;

    if (playerState === 'paused' && now - lastPausedSignalAtRef.current > SIGNAL_WINDOW_MS) {
      lastPausedSignalAtRef.current = now;
      pushSignal('paused', 'Content paused');
    }

    if (playerState === 'playing' && typeof opts.progress === 'number') {
      if (lastProgressAtRef.current > 0 && opts.progress - lastProgressAtRef.current <= 0) {
        noProgressBeatsRef.current += 1;
        if (noProgressBeatsRef.current >= 2) {
          pushSignal('idle', 'No playback progress');
        }
      } else {
        noProgressBeatsRef.current = 0;
      }
      lastProgressAtRef.current = opts.progress;
    }

    const progress = opts.getProgress ? opts.getProgress() : typeof opts.progress === 'number' ? opts.progress : 0;

    if (now - lastActivityRef.current >= IDLE_AFTER_MS && now - lastIdleSignalAtRef.current > SIGNAL_WINDOW_MS) {
      lastIdleSignalAtRef.current = now;
      pushSignal('idle', 'No user activity');
    }

    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }

    fire(
      db
        .from('learning_presence')
        .upsert(
          {
            student_id: studentId,
            activity_type: opts.activityType || 'video',
            content_id: opts.contentId || null,
            content_title: opts.contentTitle || null,
            progress: progress == null || !Number.isFinite(progress) ? 0 : Math.round(progress * 100) / 100,
            signals,
            client_id: clientIdRef.current,
            last_heartbeat_at: new Date().toISOString(),
            started_at: startedAtRef.current,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' }
        )
    );
  }, [pushSignal]);

  useEffect(() => {
    const { active, userId, activityType, contentId, contentTitle } = optsRef.current;
    if (!active || !userId || runningRef.current) return;
    runningRef.current = true;

    fire(
      db
        .from('learning_events')
        .insert({
          student_id: userId,
          event_type: 'presence_start',
          activity_type: activityType || 'video',
          content_id: contentId || null,
        })
    );

    fire(
      db
        .from('study_sessions')
        .insert({
          student_id: userId,
          activity_type: activityType || 'video',
          content_id: contentId || null,
          content_title: contentTitle || null,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()
        .then(({ data }) => {
          if (data?.id) studySessionIdRef.current = data.id;
        })
    );

    lastActivityRef.current = Date.now();
    heartbeat();

    const interval = window.setInterval(() => heartbeat(), HEARTBEAT_MS);

    const onActivity = () => { lastActivityRef.current = Date.now(); };
    const onVisibility = () => {
      if (document.hidden) {
        pushSignal('tab_hidden', 'Tab hidden while studying');
        heartbeat();
      } else {
        lastActivityRef.current = Date.now();
      }
    };
    const onBlur = () => {
      pushSignal('tab_switch', 'Window lost focus');
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        pushSignal('fullscreen_exit', 'Exited fullscreen');
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      runningRef.current = false;
      endStudySession();
      fire(
        db
          .from('learning_presence')
          .delete()
          .eq('student_id', userId)
          .eq('client_id', clientIdRef.current)
      );
      signalsRef.current = [];
      startedAtRef.current = null;
      lastIdleSignalAtRef.current = 0;
      lastPausedSignalAtRef.current = 0;
      noProgressBeatsRef.current = 0;
      lastProgressAtRef.current = 0;
    };
  }, [optsRef.current.active, optsRef.current.userId, heartbeat, endStudySession, pushSignal]);

  const reportCheckpoint = useCallback((detail?: string) => {
    const studentId = optsRef.current.userId;
    if (!studentId) return;
    fire(
      db
        .from('learning_events')
        .insert({
          student_id: studentId,
          event_type: 'checkpoint',
          detail: detail || null,
          activity_type: optsRef.current.activityType || 'video',
          content_id: optsRef.current.contentId || null,
        })
    );
  }, []);

  return { clientId: clientIdRef.current, reportCheckpoint };
}
