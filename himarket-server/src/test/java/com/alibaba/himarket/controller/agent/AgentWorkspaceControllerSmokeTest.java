package com.alibaba.himarket.controller.agent;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentWorkspaceController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentWorkspaceControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/workspaces")).andExpect(status().is4xxClientError());
    }

    @Test
    void listWorkspacesReturnsWorkspacePage() throws Exception {
        mockMvc.perform(get("/api/v1/agent/workspaces").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[0].id").isString())
                .andExpect(jsonPath("$.data.content[0].ownerId").value("agent-user"))
                .andExpect(jsonPath("$.data.content[0].isActive").isBoolean())
                .andExpect(jsonPath("$.data.totalElements").isNumber())
                .andExpect(jsonPath("$.data.totalPages").isNumber())
                .andExpect(jsonPath("$.data.first").isBoolean())
                .andExpect(jsonPath("$.data.last").isBoolean());
    }

    @Test
    void workspaceLifecycleEndpointsReturnWorkspaceShape() throws Exception {
        mockMvc.perform(
                        post("/api/v1/agent/workspaces")
                                .with(developer())
                                .contentType(json())
                                .content(WORKSPACE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.name").isString())
                .andExpect(jsonPath("$.data.createdAt").isString());

        mockMvc.perform(get("/api/v1/agent/workspaces/ws-stub").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("ws-stub"))
                .andExpect(jsonPath("$.data.defaultTeamTemplateId").isString());

        mockMvc.perform(
                        put("/api/v1/agent/workspaces/ws-stub")
                                .with(developer())
                                .contentType(json())
                                .content(WORKSPACE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updatedAt").isString());

        mockMvc.perform(put("/api/v1/agent/workspaces/ws-stub/active").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(true));

        mockMvc.perform(delete("/api/v1/agent/workspaces/ws-stub").with(developer()))
                .andExpect(status().isOk());
    }
}
