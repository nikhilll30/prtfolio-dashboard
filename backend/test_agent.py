import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.agent import RecruiterAgent

async def run_tests():
    print("=== STARTING RECRUITER AGENT INTEGRATION TESTS ===")
    
    print("\n1. Initializing RecruiterAgent...")
    try:
        agent = RecruiterAgent()
        print("[OK] Agent initialized successfully.")
    except Exception as e:
        print(f"[FAIL] Failed to initialize Agent: {e}")
        return False

    print("\n2. Checking compiled context...")
    if agent.context:
        print(f"[OK] Context compiled successfully. Length: {len(agent.context)} characters.")
        print(f"[OK] Active provider detected: {agent.provider}")
    else:
        print("[FAIL] Context is empty!")
        return False

    # 3. Test chat queries
    test_queries = [
        "Tell me about Nikhil's LangGraph system.",
        "What are the metrics for the PubMedQA BERT project?",
        "Does Nikhil have any experience with Docker?"
    ]
    
    print("\n3. Querying Agent (Testing fallback & API adapters)...")
    for query in test_queries:
        print(f"\nUser: {query}")
        try:
            response = await agent.get_response([{"role": "user", "content": query}])
            print(f"Agent ({agent.provider}): {response[:300]}...")
            if len(response) > 50:
                print("[OK] Query response validated.")
            else:
                print("[FAIL] Query response is suspiciously short!")
                return False
        except Exception as e:
            print(f"[FAIL] Error during query execution: {e}")
            return False
            
    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")
    return True

if __name__ == "__main__":
    asyncio.run(run_tests())
