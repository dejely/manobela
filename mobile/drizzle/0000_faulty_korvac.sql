CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`face_missing` integer NOT NULL,
	`ear` real,
	`eye_closed` integer NOT NULL,
	`eye_closed_sustained` integer NOT NULL,
	`perclos` real,
	`perclos_alert` integer NOT NULL,
	`mar` real,
	`yawning` integer NOT NULL,
	`yawn_sustained` real NOT NULL,
	`yawn_count` integer NOT NULL,
	`yaw` real,
	`pitch` real,
	`roll` real,
	`yaw_alert` integer NOT NULL,
	`pitch_alert` integer NOT NULL,
	`roll_alert` integer NOT NULL,
	`head_pose_sustained` real NOT NULL,
	`gaze_alert` integer NOT NULL,
	`gaze_sustained` real NOT NULL,
	`phone_usage` integer NOT NULL,
	`phone_usage_sustained` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_ms` integer
);
