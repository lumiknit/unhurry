import { toolCallSystemPrompt } from '@/lib/prompts/system_prompts';

import { SingleLLMAction } from '../chat/action';
import { ModelConfig } from '../llm';
import { FunctionTool } from '../llm/function';

/**
 * Action for chatting with a single additional message.
 * This is used with the below features:
 * - Model fallback
 * - Automatically run tools and feed to the model
 */
export class SingleTaskAction extends SingleLLMAction {
	taskOutline: string = '';
	previousSteps: string[] = [];
	currentGoal: string = '';

	override async systemPrompt(
		model: ModelConfig,
		tools: FunctionTool[]
	): Promise<string> {
		return `
${toolCallSystemPrompt(!!model.useToolCall, tools)}

# Importants

- You are a worker to help to achieve the ultimate goal.
- There is a whole task outline. You may refere them.
- There are previous step information.
- Based on your current goal, you should solve problems with tools.

# Report format

- You can give any sketch of your idea or use tools.
- BUT note that **report is required** and **only report will be used for the task**
- To finish your goal, you should give a report with markdown code block.
- Start with a line with triple backticks, and 'task:report', ends with triple backticks)
- The code block's language should be 'task:report'.
- The first line should be a summary of the report.
- The next line, you can put details which should be used in future.
  - For example, which tools you used and what is the result.
  - Which artifacts you put the result in.
  - Since only report will be passed to the next step, you should put every details in your report.

The below is a example report for writing a quick sort:

\`\`\`task:report
I wrote a quick sort in a artifact with artifact tool.
The quick sort is a efficient sorting algorithm. You can find the code in <artifact.5>
...
\`\`\`

If you did not give a report (or wrong format), user may ask as
'Then?'
to require the report.
If you almost done, please give 'task:report' to finish your job.

# Context

## Task Outline
${this.taskOutline}

## Previous Steps and Reports
${this.previousSteps.join('\n')}

## YOUR CURRENT GOAL
${this.currentGoal}

# Important

DO NOT FORGET '\`\`\`task:report\\n ... \\n\`\`\`'
			`.trim();
	}
}
