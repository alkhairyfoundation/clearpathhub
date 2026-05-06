-- ClearPath Edu Hub - Predictive Analytics Schema Enhancement
-- Run this in your Supabase SQL Editor to add predictive analytics capabilities

-- ===== PREDICTIVE ANALYTICS TABLES =====

-- Student Risk Predictions
CREATE TABLE student_risk_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score NUMERIC(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    contributing_factors JSONB, -- Stores factors like attendance, grades, behavior, etc.
    predicted_outcome TEXT, -- e.g., "likely to fail math", "at risk of dropping out"
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version TEXT, -- Track which ML model version made this prediction
    is_acknowledged BOOLEAN DEFAULT false, -- Whether admin/teacher has seen this
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prediction Features (for explainability)
CREATE TABLE prediction_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES student_risk_predictions(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL, -- e.g., "attendance_rate", "math_grade_trend"
    feature_value NUMERIC, -- Normalized value of the feature
    impact_score NUMERIC(3,2), -- How much this feature contributed to the prediction (-1 to 1)
    feature_category TEXT, -- e.g., "academic", "attendance", "behavior"
    created_at TIMESTAMP DEFAULT NOW()
);

-- Model Performance Tracking
CREATE TABLE model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    evaluation_date DATE NOT NULL,
    accuracy NUMERIC(3,2),
    precision_score NUMERIC(3,2),
    recall_score NUMERIC(3,2),
    f1_score NUMERIC(3,2),
    auc_roc NUMERIC(3,2),
    training_data_size INTEGER,
    feature_count INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Intervention Tracking
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES student_risk_predictions(id),
    intervention_type TEXT NOT NULL, -- e.g., "tutoring", "counseling", "parent_meeting"
    description TEXT,
    started_at DATE NOT NULL,
    ended_at DATE,
    status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    effectiveness_score INTEGER, -- 1-5 scale after completion
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Who created the intervention
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_student_risk_predictions_student ON student_risk_predictions(student_id);
CREATE INDEX idx_student_risk_predictions_date ON student_risk_predictions(prediction_date);
CREATE INDEX idx_student_risk_predictions_risk_level ON student_risk_predictions(risk_level);
CREATE INDEX idx_prediction_features_prediction ON prediction_features(prediction_id);
CREATE INDEX idx_interventions_student ON interventions(student_id);
CREATE INDEX idx_interventions_status ON interventions(status);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS and set up policies for new tables
ALTER TABLE student_risk_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own risk predictions" ON student_risk_predictions 
    FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers and admins can view risk predictions" ON student_risk_predictions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant')
        )
    );
CREATE POLICY "Users can insert own risk predictions" ON student_risk_predictions 
    FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can update risk predictions" ON student_risk_predictions 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

ALTER TABLE prediction_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prediction features" ON prediction_features 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_risk_predictions srp 
            WHERE srp.id = prediction_id AND srp.student_id = auth.uid()
        )
    );
CREATE POLICY "Teachers and admins can view prediction features" ON prediction_features 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant')
        )
    );

ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view model performance" ON model_performance 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interventions" ON interventions 
    FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers and admins can view interventions" ON interventions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant')
        )
    );
CREATE POLICY "Users can insert own interventions" ON interventions 
    FOR INSERT WITH CHECK (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant')
        )
    );
CREATE POLICY "Admins can update interventions" ON interventions 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===== SEED DATA =====

-- Insert default model performance record
INSERT INTO model_performance (model_name, model_version, evaluation_date, accuracy, precision_score, recall_score, f1_score, auc_roc, training_data_size, feature_count, notes)
VALUES (
    'risk_prediction_v1',
    '1.0.0',
    CURRENT_DATE,
    0.85,
    0.82,
    0.88,
    0.85,
    0.89,
    1000,
    15,
    'Initial model for student risk prediction'
) ON CONFLICT DO NOTHING;