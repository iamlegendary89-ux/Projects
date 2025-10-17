# SmartMatch Dual-Agent Development Workflow

## Overview

The SmartMatch project implements a dual-agent development workflow using Model Context Protocol (MCP) servers to facilitate AI-powered development collaboration. Two specialized MCP servers work together:

- **SmartMatch Builder** (`smartmatch-builder`): Uses qwen2.5-coder model for code generation, refactoring, and implementation
- **SmartMatch Thinker** (`smartmatch-thinker`): Uses phi4:reasoning model for analysis, planning, and code review

Both agents communicate through the Claude development environment and are fully offline-capable using local Ollama models.

## Architecture

### MCP Server Infrastructure

**SmartMatch Builder MCP Server** (`smartmatch-builder`)
- **Model**: qwen2.5-coder via Ollama
- **Endpoint**: http://localhost:11434/api/generate
- **Capabilities**:
  - Code generation and implementation
  - Code refactoring and optimization
  - Feature addition and integration
  - Code review and improvement suggestions
  - Algorithm implementation

**SmartMatch Thinker MCP Server** (`smartmatch-thinker`)
- **Model**: phi4:reasoning via Ollama
- **Endpoint**: http://localhost:11434/api/generate
- **Capabilities**:
  - Task analysis and complexity assessment
  - Architectural design and planning
  - Comprehensive code review
  - Performance analysis and optimization
  - Testing strategy planning
  - Deployment readiness assessment
  - Debug analysis and root cause identification

### Configuration

Both MCP servers are configured in:
`c:\Users\omarh\AppData\Roaming\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "smartmatch-builder": {
      "command": "node",
      "args": ["C:\\Users\\omarh\\OneDrive\\Documents\\Cline\\MCP\\smartmatch-builder\\smartmatch-builder\\build\\index.js"],
      "disabled": false,
      "autoApprove": []
    },
    "smartmatch-thinker": {
      "command": "node",
      "args": ["C:\\Users\\omarh\\OneDrive\\Documents\\Cline\\MCP\\smartmatch-thinker\\smartmatch-thinker\\build\\index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Development Workflow

### Phase 1: Analysis & Planning (Thinker Agent)

1. **Task Analysis**: Use `analyze_task` to assess complexity, dependencies, risks, and requirements
2. **Architecture Design**: Use `architect_solution` to design optimal implementation approaches
3. **Testing Strategy**: Use `plan_testing_strategy` to design comprehensive testing approaches
4. **Code Review Planning**: Establish criteria for implementation quality

### Phase 2: Implementation (Builder Agent)

1. **Code Generation**: Use `generate_code` to create new components and functions
2. **Refactoring**: Use `refactor_code` to improve existing code quality
3. **Feature Integration**: Use `add_functionality` to extend existing codebases
4. **Algorithm Implementation**: Use `implement_algorithm` for complex logic

### Phase 3: Review & Optimization (Thinker → Builder Loop)

1. **Deep Code Review**: Use `review_code_deep` for comprehensive analysis
2. **Performance Analysis**: Use `optimze_performance` to identify bottlenecks
3. **Debug Analysis**: Use `debug_analyze` for issue resolution
4. **Deployment Assessment**: Use `review_prerequisites` for production readiness

### Phase 4: Testing & Validation

1. Execute planned testing strategies
2. Iterate on implementation based on review feedback
3. Performance optimization based on analysis
4. Final deployment readiness confirmation

## Tool Capabilities Matrix

| Tool | Builder Agent | Thinker Agent | Purpose |
|------|---------------|----------------|---------|
| `generate_code` | ✅ | ❌ | High-quality code generation |
| `refactor_code` | ✅ | ❌ | Code improvement and optimization |
| `add_functionality` | ✅ | ❌ | Feature integration |
| `review_code` | ✅ | ❌ | Code review suggestions |
| `implement_algorithm` | ✅ | ❌ | Algorithm development |
| `analyze_task` | ❌ | ✅ | Task complexity analysis |
| `review_code_deep` | ❌ | ✅ | Architectural code review |
| `architect_solution` | ❌ | ✅ | System architecture design |
| `debug_analyze` | ❌ | ✅ | Root cause analysis |
| `optimze_performance` | ❌ | ✅ | Performance bottleneck analysis |
| `plan_testing_strategy` | ❌ | ✅ | Testing strategy design |
| `review_prerequisites` | ❌ | ✅ | Deployment readiness assessment |

## Usage Examples

### Example 1: New Feature Implementation

```bash
# Phase 1: Thinker analyzes the task
/thinker analyze_task --task_description "Add real-time phone availability checking"

# Phase 2: Thinker designs the architecture
/thinker architect_solution --requirements "Real-time availability checking with caching"

# Phase 3: Builder implements the feature
/builder generate_code --requirements "Implement availability checker service"

# Phase 4: Thinker reviews the implementation
/thinker review_code_deep --code "..." --focus_areas ["architecture", "performance", "security"]
```

### Example 2: Bug Resolution

```bash
# Phase 1: Thinker analyzes the error
/thinker debug_analyze --error_description "Database connection timeout in production"

# Phase 2: Thinker suggests fixes
/thinker architect_solution --requirements "Fix database connection issues"

# Phase 3: Builder implements the fix
/builder refactor_code --code "..." --changes "Implement connection pooling"

# Phase 4: Thinker validates the solution
/thinker review_prerequisites --feature_code "..." --target_environment "production"
```

## Offline Operation

The entire dual-agent workflow operates completely offline:

- **No Cloud Dependencies**: Uses local Ollama models only
- **No External APIs**: All processing happens locally
- **Self-Contained**: VS Code integration with MCP servers
- **Caching**: Both agents implement response caching for efficiency

## Prerequisites

### Ollama Installation and Models

1. **Install Ollama**: Download from https://ollama.ai/
2. **Pull Models**:
   ```bash
   ollama pull qwen2.5-coder
   ollama pull phi4:reasoning
   ```
3. **Verify Installation**:
   ```bash
   ollama list
   ```

### MCP Server Build Process

1. **Builder Server**:
   ```bash
   cd C:\Users\omarh\OneDrive\Documents\Cline\MCP\smartmatch-builder\smartmatch-builder
   npm install
   npm run build
   ```

2. **Thinker Server**:
   ```bash
   cd C:\Users\omarh\OneDrive\Documents\Cline\MCP\smartmatch-thinker\smartmatch-thinker
   npm install
   npm run build
   ```

### VS Code Integration

The MCP servers are automatically loaded by the Claude extension when VS Code starts. The servers will be available as tools within the development environment.

## Error Handling & Resilience

- **API Failures**: Both agents handle Ollama API failures gracefully
- **Caching**: Responses are cached to reduce redundant API calls
- **Timeout Handling**: Requests include appropriate timeouts
- **Fallback Behavior**: Agents can continue operating if one model is unavailable

## Performance Optimization

- **Response Caching**: Identical requests return cached responses
- **Streaming Disabled**: Full responses collected before returning to avoid interruptions
- **Model Selection**: Specialized models for specific tasks (coding vs reasoning)
- **Error Recovery**: Robust error handling prevents workflow interruptions

## Monitoring & Logging

Both MCP servers provide console logging for:
- API call initiation and completion
- Response caching hits/misses
- Error conditions and recovery
- Performance metrics (response sizes, timings)

## Security Considerations

- **Local Operation**: All processing happens locally, no data sent externally
- **No Authentication**: No external service credentials required
- **Code Analysis**: Sensitive information should not be included in prompts
- **Output Validation**: Always review AI-generated code before implementation

## Future Enhancements

- **Workflow Orchestration**: Automated agent coordination scripts
- **Result Persistence**: Store analysis results and decisions
- **Quality Metrics**: Track code quality improvements over time
- **Collaborative Features**: Multi-agent conversation and consensus building
- **Integration Testing**: Automated testing of agent interactions

## Troubleshooting

### Common Issues

1. **Ollama Connection Failed**:
   - Verify Ollama is running: `ollama list`
   - Check API endpoint: curl http://localhost:11434/api/version

2. **MCP Server Not Loading**:
   - Verify build output exists in `build/index.js`
   - Check VS Code MCP settings path
   - Restart VS Code

3. **Model Not Available**:
   - Pull model: `ollama pull <model-name>`
   - Verify model loaded: `ollama list`

4. **TypeScript Compilation Errors**:
   - Ensure dependencies installed: `npm install`
   - Check TypeScript configuration

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=1
```

This provides verbose output for troubleshooting MCP server operations.
