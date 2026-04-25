package com.alibaba.himarket.controller.agent;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentTeamTemplateController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentTeamTemplateControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/team-templates")).andExpect(status().is4xxClientError());
    }

    @Test
    void teamTemplateEndpointsReturnTemplateShape() throws Exception {
        mockMvc.perform(get("/api/v1/agent/team-templates").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").isString())
                .andExpect(jsonPath("$.data[0].manager.id").isString())
                .andExpect(jsonPath("$.data[0].workers").isArray())
                .andExpect(jsonPath("$.data[0].defaultSkills").isArray())
                .andExpect(jsonPath("$.data[0].defaultMcps").isArray());

        mockMvc.perform(get("/api/v1/agent/team-templates/team-template-stub").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("team-template-stub"))
                .andExpect(jsonPath("$.data.version").isString())
                .andExpect(jsonPath("$.data.manager.systemPromptDigest").isString());
    }
}
