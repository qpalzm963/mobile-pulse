CREATE TABLE `submission_annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`reviewer_token` text NOT NULL,
	`selected_text` text NOT NULL,
	`text_offset_start` integer NOT NULL,
	`text_offset_end` integer NOT NULL,
	`comment` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `submission_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`reviewer_token` text NOT NULL,
	`score_depth` integer NOT NULL,
	`score_clarity` integer NOT NULL,
	`score_practicality` integer NOT NULL,
	`general_feedback` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "score_depth_check" CHECK("submission_ratings"."score_depth" >= 1 and "submission_ratings"."score_depth" <= 5),
	CONSTRAINT "score_clarity_check" CHECK("submission_ratings"."score_clarity" >= 1 and "submission_ratings"."score_clarity" <= 5),
	CONSTRAINT "score_practicality_check" CHECK("submission_ratings"."score_practicality" >= 1 and "submission_ratings"."score_practicality" <= 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_ratings_sub_reviewer` ON `submission_ratings` (`submission_id`,`reviewer_token`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`author_alias` text DEFAULT '匿名組員' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'reviewing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_slug_unique` ON `submissions` (`slug`);