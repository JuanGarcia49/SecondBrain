
import os
import discord
from llm_parser import extract_transaction
from discord.ext import commands
from dotenv import load_dotenv
from database import insert_transaction

# Load the secrets from the .env file
load_dotenv()
TOKEN = os.getenv('DISCORD_BOT_TOKEN')

# Enable the message content intent so the bot can read your SMS texts
intents = discord.Intents.default()
intents.message_content = True

# Initialize the bot
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ Successfully logged in as {bot.user.name}')

###################################
@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    # Extract the data using the LLM
    transaction_data = extract_transaction(message.content)

    # If the dictionary is valid, insert it and reply
    if transaction_data:
        insert_transaction(transaction_data, message.content)
        await message.channel.send(f"✅ Saved! Vendor: {transaction_data['vendor']} | Amount: {transaction_data['amount']} | Category: {transaction_data['category']}")

    await bot.process_commands(message)

if __name__ == '__main__':
    bot.run(TOKEN)
