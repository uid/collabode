CREATE TABLE PAD_APOOL (
  ID varchar(128) NOT NULL,
  JSON long varchar NOT NULL,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_AUTHORS_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_AUTHORS_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  unique (NUMID,PAGESTART)
);

CREATE TABLE PAD_META (
  ID varchar(128) NOT NULL,
  JSON long varchar NOT NULL,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVMETA_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVMETA_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  unique (NUMID,PAGESTART)
);

CREATE TABLE PAD_REVS1000_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVS1000_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  UNIQUE (NUMID,PAGESTART)
);

CREATE TABLE PAD_REVS100_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVS100_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  unique (NUMID,PAGESTART)
);

CREATE TABLE PAD_REVS10_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVS10_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  unique (NUMID,PAGESTART)
);

CREATE TABLE PAD_REVS_META (
  ID varchar(128) NOT NULL,
  NUMID int NOT NULL generated always as identity,
  PRIMARY KEY  (ID)
);

CREATE TABLE PAD_REVS_TEXT (
  NUMID int default NULL,
  PAGESTART int default NULL,
  OFFSETS varchar(256) NOT NULL default ',,,,,,,,,,,,,,,,,,,',
  DATA long varchar NOT NULL,
  unique (NUMID,PAGESTART)
);

CREATE TABLE PAD_SQLMETA (
  "id" varchar(128) NOT NULL,
  "lastWriteTime" timestamp NOT NULL,
  "creationTime" timestamp NOT NULL,
  "version" int NOT NULL,
  "headRev" int NOT NULL,
  PRIMARY KEY  ("id"),
  unique ("version")
);

CREATE TABLE "pad_guests" (
  "id" int NOT NULL generated always as identity,
  "data" long varchar,
  "userId" varchar(63) NOT NULL,
  "lastActiveDate" timestamp NOT NULL,
  "privateKey" varchar(63) NOT NULL,
  "createdDate" timestamp NOT NULL,
  PRIMARY KEY  ("id"),
  UNIQUE ("userId"),
  UNIQUE ("privateKey")
);

CREATE TABLE "pro_domains" (
  "id" int NOT NULL generated always as identity,
  "extDomain" varchar(128) default NULL,
  "orgName" varchar(128) default NULL,
  "subDomain" varchar(128) NOT NULL,
  PRIMARY KEY  ("id"),
  UNIQUE ("subDomain")
);
