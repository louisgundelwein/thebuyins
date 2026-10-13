CREATE TABLE "hidden_game" (
	"user_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "hidden_game_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "left_at" timestamp;--> statement-breakpoint
ALTER TABLE "hidden_game" ADD CONSTRAINT "hidden_game_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_game" ADD CONSTRAINT "hidden_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;