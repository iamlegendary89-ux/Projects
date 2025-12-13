CREATE TABLE "phones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"price" integer,
	"release_date" timestamp,
	"image_url" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_id" integer,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"author" text,
	"rating" integer,
	"summary" text,
	"sentiment" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_phone_id_phones_id_fk" FOREIGN KEY ("phone_id") REFERENCES "public"."phones"("id") ON DELETE no action ON UPDATE no action;