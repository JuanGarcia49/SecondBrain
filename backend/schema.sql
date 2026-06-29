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

create table meals(
	id int generated always as identity,
	dish_name text,
	meal_type text,
	cook_date timestamp default NOW() not null,
	has_leftovers bool,
	transaction_id int,
	constraint PK_meals primary key (id),
	constraint FK_meals foreign key (transaction_id) references transactions(id)
);

create table ingredients(
	id int generated always as identity,
	name text unique,
	constraint PK_ingredients primary key (id)
);

create table meal_ingredients(
	meal_id int,
	ingredient_id int,
	constraint PK_meal_ingredients primary key (meal_id, ingredient_id),
	constraint FK_meal_ingredients_meal foreign key (meal_id) references meals(id),
	constraint FK_meal_ingredients_ingrediente foreign key (ingredient_id) references ingredients(id)
);

select 
	t.id, 
	c.name, 
	t.vendor, 
	REPLACE(to_char(t.amount, 'FM999,999,999'), ',', '.') AS amount, 
	t.transaction_date, 
	t.raw_sms 
from transactions t 
join categories c on t.category_id = c.id
;
