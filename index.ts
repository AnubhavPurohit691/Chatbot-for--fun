import { ChatGroq } from "@langchain/groq"
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { TavilySearch } from "@langchain/tavily"
import readline from "node:readline/promises"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const tool = new TavilySearch({
  maxResults: 3,
  topic: "general"
})
const tools = [tool]

const toolnode = new ToolNode(tools)

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2
}).bindTools(tools)
const Mockllm = async (state: typeof MessagesAnnotation.State) => {
  const response = await llm.invoke(state.messages)
  return { messages: [response] }
}
function shouldContinue(state: any) {
  let lastmessage = state.messages[state.messages.length - 1]
  if (lastmessage?.tool_calls && lastmessage.tool_calls.length > 0) {
    return "tool"
  }
  return "__end__"
}
const graph = new StateGraph(MessagesAnnotation)
  .addNode("mock_llm", Mockllm)
  .addNode("tool", toolnode)
  .addEdge("__start__", "mock_llm")
  .addConditionalEdges("mock_llm", shouldContinue
    , {
      tool: "tool",
      __end__: "__end__",
    }
  )
  .addEdge("tool", "mock_llm")
  .compile()


async function main() {
  const msg = await rl.question(" what can i help you : ")
  const finalstate: any = await graph.invoke({ messages: [{ role: "human", content: msg }] })
  console.log(finalstate.messages[finalstate.messages.length - 1].content)
  console.log(finalstate.messages)
  rl.close()
}

main()


