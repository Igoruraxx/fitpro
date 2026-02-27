CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`clientId` int,
	`guestName` varchar(255),
	`date` date NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`duration` int NOT NULL DEFAULT 60,
	`status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bodyMeasurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`clientId` int NOT NULL,
	`date` date NOT NULL,
	`weight` decimal(5,2),
	`height` decimal(5,2),
	`bodyFat` decimal(5,2),
	`chest` decimal(5,2),
	`waist` decimal(5,2),
	`hips` decimal(5,2),
	`leftArm` decimal(5,2),
	`rightArm` decimal(5,2),
	`leftThigh` decimal(5,2),
	`rightThigh` decimal(5,2),
	`leftCalf` decimal(5,2),
	`rightCalf` decimal(5,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bodyMeasurements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`birthDate` date,
	`gender` enum('male','female','other'),
	`photoUrl` text,
	`notes` text,
	`goal` text,
	`status` enum('active','inactive','trial') NOT NULL DEFAULT 'active',
	`monthlyFee` decimal(10,2),
	`paymentDay` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progressPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`clientId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoType` enum('front','back','side_left','side_right','other') NOT NULL DEFAULT 'front',
	`date` date NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progressPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`clientId` int,
	`type` enum('income','expense') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `specialties` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `cref` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionPlan` enum('free','basic','pro','premium') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','inactive','trial','cancelled') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `maxClients` int DEFAULT 5 NOT NULL;