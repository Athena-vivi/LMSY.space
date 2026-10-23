-- 2026-10-23 public_appearance: remove the airport sighting row.
--
-- The row was filed as an appearance but it is not one: there is no host, no
-- stage and no event - it is the person in transit. Its three assets go with
-- it. The R2 objects are NOT deleted, so this is undoable without a re-upload.
--
-- Project : d3a265f4-0fab-476d-86ea-b27402011448  (20260320-airport)
-- Assets  : ddc1262b-786d-40eb-90ac-e5f7149d7249  LMSY-APPEAR-AIRPORT-20260320-001
--           f0dd2148-3e71-4046-b625-6df82a6327ed  LMSY-APPEAR-AIRPORT-20260320-002
--           463ea4bb-df54-4a9a-bfe0-232988ed05d8  LMSY-APPEAR-AIRPORT-20260320-003
--
-- Snapshot of both rows: temp/20261023_airport_project.json,
--                        temp/20261023_airport_assets.json
-- Full rollback:          temp/20261023_public_appearance_rollback.sql
--
-- Run with temp/p7_delete_rows.py (it prints the rows first and refuses on any
-- id it cannot find), not with p7_exec.py.

begin;

delete from lmsy_archive.gallery_assets
 where project_id = 'd3a265f4-0fab-476d-86ea-b27402011448'
   and id in (
     'ddc1262b-786d-40eb-90ac-e5f7149d7249',
     'f0dd2148-3e71-4046-b625-6df82a6327ed',
     '463ea4bb-df54-4a9a-bfe0-232988ed05d8'
   );

delete from lmsy_archive.projects
 where id = 'd3a265f4-0fab-476d-86ea-b27402011448';

commit;
