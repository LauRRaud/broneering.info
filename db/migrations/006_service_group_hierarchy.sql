ALTER TABLE service_groups ADD COLUMN parent_id uuid,
 ADD CONSTRAINT group_parent_tenant_fk FOREIGN KEY (tenant_id,parent_id) REFERENCES service_groups(tenant_id,id),
 ADD CONSTRAINT group_not_own_parent CHECK (parent_id IS NULL OR parent_id<>id);
ALTER TABLE service_groups DROP CONSTRAINT service_groups_tenant_id_name_key;
ALTER TABLE service_groups ADD CONSTRAINT group_sibling_name UNIQUE NULLS NOT DISTINCT (tenant_id,parent_id,name);
CREATE INDEX service_groups_parent ON service_groups(tenant_id,parent_id);
-- Invoker security preserves tenant RLS. Missing/cyclic branches stay unavailable publicly.
CREATE VIEW service_group_tree WITH (security_invoker=true) AS
 WITH RECURSIVE tree AS (
  SELECT g.*,g.name::text AS path,g.active AS effective_active,ARRAY[g.id] AS ancestry
  FROM service_groups g WHERE parent_id IS NULL
  UNION ALL
  SELECT g.*,tree.path||' / '||g.name,g.active AND tree.effective_active,tree.ancestry||g.id
  FROM service_groups g JOIN tree ON tree.tenant_id=g.tenant_id AND tree.id=g.parent_id
  WHERE NOT g.id=ANY(tree.ancestry)
 )
 SELECT * FROM tree;
GRANT SELECT ON service_group_tree TO booking_app;
