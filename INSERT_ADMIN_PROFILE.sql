-- Insert admin profile for the user we created in auth.users earlier
INSERT INTO profiles (id, email, first_name, last_name, role, phone)
VALUES 
  ('88f91d79-73cf-49ce-84a0-f8d631739c3e', 'admin@clearpath.com', 'System', 'Administrator', 'admin', null)
ON CONFLICT (id) DO NOTHING
RETURNING id, email, role;