ALTER TABLE tasks DROP CONSTRAINT tasks_destination_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_destination_check
  CHECK (destination IN ('on_deck', 'someday', 'in_progress', 'upcoming'));
