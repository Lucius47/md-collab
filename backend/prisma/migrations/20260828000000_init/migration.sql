-- gen_random_uuid() is core in Postgres 13+; this is a harmless no-op safety
-- net for older/managed instances that still need the extension explicitly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('file', 'folder');
CREATE TYPE "PermissionRole" AS ENUM ('viewer', 'editor', 'manager');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "oauth_provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "owner_id" UUID NOT NULL,
    "s3_key" TEXT,
    "content" TEXT DEFAULT '',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "public_link_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,
    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "node_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PermissionRole" NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("node_id","user_id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","node_id")
);

-- CreateTable
CREATE TABLE "versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "s3_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_oauth_provider_id_key" ON "users"("oauth_provider_id");

CREATE UNIQUE INDEX "nodes_public_link_id_key" ON "nodes"("public_link_id");
CREATE INDEX "nodes_parent_id_idx" ON "nodes"("parent_id");
CREATE INDEX "nodes_owner_id_idx" ON "nodes"("owner_id");
CREATE INDEX "nodes_deleted_at_idx" ON "nodes"("deleted_at");
CREATE INDEX "nodes_search_vector_idx" ON "nodes" USING GIN ("search_vector");

CREATE INDEX "permissions_user_id_idx" ON "permissions"("user_id");

CREATE INDEX "versions_node_id_idx" ON "versions"("node_id");

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "permissions" ADD CONSTRAINT "permissions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "versions" ADD CONSTRAINT "versions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "versions" ADD CONSTRAINT "versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Full-text search: keep search_vector in sync automatically on every
-- insert/update, weighting the title higher than the body.
CREATE FUNCTION nodes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, content ON "nodes"
  FOR EACH ROW EXECUTE FUNCTION nodes_search_vector_update();
