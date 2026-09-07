-- Issue E: OTP Password Reset table
-- Run this SQL against your MySQL database to enable the forgot-password flow.
-- Once this table exists, the /api/auth/forgot-password and /api/auth/reset-password endpoints will work.

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `otp`        VARCHAR(6)   NOT NULL,
  `expires_at` DATETIME     NOT NULL,
  `used`       TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pr_user` (`user_id`),
  CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
