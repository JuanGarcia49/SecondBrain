create TABLE categories(
	id INT generated always as identity,
	name TEXT unique not null,
	description TEXT,
	constraint PK_categories primary key (id));

create table transactions(
	id INT generated always as identity,
	category_id INT,
	vendor TEXT not null,
	amount numeric not null,
	transaction_date timestamp default NOW() not null,
	raw_sms TEXT,
	constraint PK_transactions primary key (id),
	constraint FK_transactions foreign key (category_id) references categories(id));

create table discord_bot_state(
	id INT generated always as identity,
	session_id TEXT not null,
	current_step TEXT not null,
	pending_data JSONB,
	updated_at timestamp not null,
	constraint PK_discord primary key (id));

select table_name
from information_schema."tables"
where table_schema = 'public';
