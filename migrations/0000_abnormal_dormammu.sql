CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`githubId` text NOT NULL,
	`email` text,
	`name` text,
	`image` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_githubId_unique` ON `User` (`githubId`);--> statement-breakpoint
CREATE TABLE `Bot` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`qq` text NOT NULL,
	`appId` text NOT NULL,
	`secretEnc` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Bot_appId_unique` ON `Bot` (`appId`);--> statement-breakpoint
CREATE TABLE `WebhookEvent` (
	`id` text PRIMARY KEY NOT NULL,
	`botId` text NOT NULL,
	`op` integer,
	`eventType` text,
	`payload` text NOT NULL,
	`receivedAt` integer NOT NULL,
	FOREIGN KEY (`botId`) REFERENCES `Bot`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `WebhookEvent_botId_receivedAt_idx` ON `WebhookEvent` (`botId`,`receivedAt`);
