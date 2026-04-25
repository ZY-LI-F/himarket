package com.alibaba.himarket.controller.agent;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentRoomConfigController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentRoomConfigControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/config"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void configEndpointsReturnRoomConfigShape() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/config").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomId").value("room-stub"))
                .andExpect(jsonPath("$.data.skillBindings").isArray())
                .andExpect(jsonPath("$.data.skillBindings[0].productId").isString())
                .andExpect(jsonPath("$.data.mcpBindings").isArray())
                .andExpect(jsonPath("$.data.permission.readonly").isBoolean());

        mockMvc.perform(
                        put("/api/v1/agent/rooms/room-stub/config")
                                .with(developer())
                                .contentType(json())
                                .content(CONFIG_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modelId").value("qwen-plus"))
                .andExpect(jsonPath("$.data.permission.allowedUserIds").isArray());
    }
}
