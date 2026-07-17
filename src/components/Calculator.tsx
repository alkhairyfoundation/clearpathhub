'use client';

import { useState } from 'react';
import { Calculator as CalcIcon, X } from 'lucide-react';

export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  function inputDigit(digit: string) {
    if (waiting) { setDisplay(digit); setWaiting(false); return; }
    setDisplay(display === '0' ? digit : display + digit);
  }

  function inputDecimal() {
    if (waiting) { setDisplay('0.'); setWaiting(false); return; }
    if (!display.includes('.')) setDisplay(display + '.');
  }

  function handleOperator(op: string) {
    const cur = parseFloat(display);
    if (prevValue !== null && operator && !waiting) {
      const result = compute(prevValue, cur, operator);
      setDisplay(String(result));
      setPrevValue(result);
    } else {
      setPrevValue(cur);
    }
    setOperator(op);
    setWaiting(true);
  }

  function compute(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  }

  function handleEquals() {
    if (prevValue === null || !operator) return;
    const cur = parseFloat(display);
    const result = compute(prevValue, cur, operator);
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaiting(true);
  }

  function clear() {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaiting(false);
  }

  const btn = 'bg-white border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 active:bg-slate-200 transition-all py-2.5';
  const opBtn = 'bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-900/40 dark:border-primary-900/40 rounded-lg text-sm font-bold text-primary-700 dark:text-primary-300 dark:text-primary-300 hover:bg-primary-200 active:bg-primary-300 transition-all py-2.5';
  const eqBtn = 'bg-primary-600 border border-primary-600 rounded-lg text-sm font-bold text-white hover:bg-primary-700 active:bg-primary-800 transition-all py-2.5';

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl hover:bg-primary-700 active:bg-primary-800 transition-all flex items-center justify-center"
        title="Toggle Calculator"
      >
        <CalcIcon size={24} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1.5"><CalcIcon size={14} />Calculator</span>
            <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-slate-200 rounded"><X size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" /></button>
          </div>

          <div className="px-4 py-3 bg-white border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white font-mono truncate">{display}</div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-3">
            <button onClick={clear} className="bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg text-sm font-bold text-red-700 dark:text-red-400 dark:text-red-400 hover:bg-red-200 active:bg-red-300 transition-all py-2.5">C</button>
            <button onClick={() => handleOperator('÷')} className={opBtn}>÷</button>
            <button onClick={() => handleOperator('×')} className={opBtn}>×</button>
            <button onClick={() => handleOperator('-')} className={opBtn}>−</button>

            <button onClick={() => inputDigit('7')} className={btn}>7</button>
            <button onClick={() => inputDigit('8')} className={btn}>8</button>
            <button onClick={() => inputDigit('9')} className={btn}>9</button>
            <button onClick={() => handleOperator('+')} className={opBtn} style={{ gridRow: 'span 2' }}>+</button>

            <button onClick={() => inputDigit('4')} className={btn}>4</button>
            <button onClick={() => inputDigit('5')} className={btn}>5</button>
            <button onClick={() => inputDigit('6')} className={btn}>6</button>

            <button onClick={() => inputDigit('1')} className={btn}>1</button>
            <button onClick={() => inputDigit('2')} className={btn}>2</button>
            <button onClick={() => inputDigit('3')} className={btn}>3</button>
            <button onClick={handleEquals} className={eqBtn}>=</button>

            <button onClick={() => inputDigit('0')} className={`${btn} col-span-2`}>0</button>
            <button onClick={inputDecimal} className={btn}>.</button>
          </div>
        </div>
      )}
    </>
  );
}
