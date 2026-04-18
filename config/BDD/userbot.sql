-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 172.32.32.1:3306
-- Generation Time: Apr 18, 2026 at 03:03 AM
-- Server version: 12.0.2-MariaDB-ubu2404
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `userbot`
--

-- --------------------------------------------------------

--
-- Table structure for table `alerts`
--

CREATE TABLE `alerts` (
  `id` int(11) NOT NULL,
  `discordID` varchar(255) NOT NULL,
  `text` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cf`
--

CREATE TABLE `cf` (
  `id` int(11) NOT NULL,
  `pseudo` varchar(255) NOT NULL,
  `discordID` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commands`
--

CREATE TABLE `commands` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `aliases` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL,
  `content` text NOT NULL,
  `textLinkButton` text DEFAULT NULL,
  `linkButton` text DEFAULT NULL,
  `author` varchar(255) NOT NULL,
  `createdAt` varchar(255) NOT NULL,
  `lastModificationBy` varchar(255) DEFAULT NULL,
  `lastModificationAt` varchar(255) DEFAULT NULL,
  `numberOfUses` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forms`
--

CREATE TABLE `forms` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `content` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `giveaways`
--

CREATE TABLE `giveaways` (
  `id` int(11) NOT NULL,
  `prize` varchar(255) NOT NULL,
  `winnersCount` int(11) NOT NULL,
  `channel` varchar(255) NOT NULL,
  `timestampEnd` varchar(255) NOT NULL,
  `hostedBy` varchar(255) NOT NULL,
  `messageId` varchar(255) DEFAULT NULL,
  `excludedIds` varchar(255) NOT NULL,
  `started` tinyint(1) NOT NULL,
  `ended` tinyint(1) NOT NULL,
  `timeoutId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mute`
--

CREATE TABLE `mute` (
  `id` int(11) NOT NULL,
  `discordID` varchar(255) NOT NULL,
  `timestampStart` varchar(255) NOT NULL,
  `timestampEnd` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `id` int(11) NOT NULL,
  `discordID` varchar(255) NOT NULL,
  `reminder` text NOT NULL,
  `timestampEnd` varchar(255) NOT NULL,
  `channel` varchar(255) NOT NULL,
  `private` tinyint(1) NOT NULL,
  `timeoutId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spam_reports`
--

CREATE TABLE `spam_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `report_id` varchar(64) NOT NULL,
  `guild_id` varchar(32) NOT NULL,
  `user_id` varchar(32) NOT NULL,
  `report_message_id` varchar(32) DEFAULT NULL,
  `sanction_type` varchar(32) NOT NULL DEFAULT 'none',
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `created_at` int(10) UNSIGNED NOT NULL,
  `handled_by` varchar(32) DEFAULT NULL,
  `handled_at` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vocal`
--

CREATE TABLE `vocal` (
  `id` int(11) NOT NULL,
  `channelId` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

CREATE TABLE `votes` (
  `id` int(11) NOT NULL,
  `messageId` varchar(255) NOT NULL,
  `memberId` varchar(255) NOT NULL,
  `vote` varchar(255) NOT NULL,
  `createdAt` varchar(255) NOT NULL,
  `editedAt` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alerts`
--
ALTER TABLE `alerts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cf`
--
ALTER TABLE `cf`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `commands`
--
ALTER TABLE `commands`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `commands` ADD FULLTEXT KEY `name` (`name`);
ALTER TABLE `commands` ADD FULLTEXT KEY `content` (`content`);

--
-- Indexes for table `forms`
--
ALTER TABLE `forms`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `giveaways`
--
ALTER TABLE `giveaways`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `mute`
--
ALTER TABLE `mute`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `spam_reports`
--
ALTER TABLE `spam_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_spam_reports_report_id` (`report_id`);

--
-- Indexes for table `vocal`
--
ALTER TABLE `vocal`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alerts`
--
ALTER TABLE `alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cf`
--
ALTER TABLE `cf`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commands`
--
ALTER TABLE `commands`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `forms`
--
ALTER TABLE `forms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `giveaways`
--
ALTER TABLE `giveaways`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mute`
--
ALTER TABLE `mute`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spam_reports`
--
ALTER TABLE `spam_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vocal`
--
ALTER TABLE `vocal`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
