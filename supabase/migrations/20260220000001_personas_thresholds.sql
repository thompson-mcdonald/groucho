ALTER TABLE personas
ADD COLUMN pass_threshold numeric default 0.65,
ADD COLUMN reject_threshold numeric default 0.25;
