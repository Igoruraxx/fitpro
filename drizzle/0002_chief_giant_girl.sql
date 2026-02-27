ALTER TABLE `appointments` ADD `recurrenceGroupId` varchar(36);--> statement-breakpoint
ALTER TABLE `appointments` ADD `recurrenceType` enum('none','daily','weekly','biweekly','monthly') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `recurrenceDays` varchar(20);