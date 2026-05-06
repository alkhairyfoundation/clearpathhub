-- Insert admin profile for the user we created in auth.users earlier
INSERT INTO profiles (id, email, first_name, last_name, role, phone)
VALUES 
  ('00ec7539-113e-49c1-b022-ff696fdd9283', 'admin@clearpatheduhub.com', 'System', 'Administrator', 'admin', '+1234567890')
ON CONFLICT (id) DO NOTHING
RETURNING id, email, role;