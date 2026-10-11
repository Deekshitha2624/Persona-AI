from ai.gemini_client import analyze_conversation

conversation = """
Manager: Can you send me the project report today?
Me: Yes, I will send it by evening.
Manager: Okay, please make sure all the hardware details are included.
"""

result = analyze_conversation(conversation)

print(result)