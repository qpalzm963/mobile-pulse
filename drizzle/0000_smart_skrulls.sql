CREATE TABLE `article_feedback` (
	`article_slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`reaction` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`article_slug`, `visitor_id`),
	CONSTRAINT "article_feedback_reaction" CHECK("article_feedback"."reaction" in ('useful', 'not_useful'))
);
--> statement-breakpoint
CREATE TABLE `article_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`view_day` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_views_slug_visitor_day` ON `article_views` (`article_slug`,`visitor_id`,`view_day`);