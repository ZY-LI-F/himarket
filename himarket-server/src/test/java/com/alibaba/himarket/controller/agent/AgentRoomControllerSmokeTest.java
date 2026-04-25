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

@WebMvcTest(AgentRoomController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentRoomControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/workspaces/ws-stub/rooms"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void roomEndpointsReturnRoomShape() throws Exception {
        mockMvc.perform(get("/api/v1/agent/workspaces/ws-stub/rooms").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").isString())
                .andExpect(jsonPath("$.data[0].workspaceId").value("ws-stub"))
                .andExpect(jsonPath("$.data[0].permission.readonly").isBoolean())
                .andExpect(jsonPath("$.data[0].permission.allowedUserIds").isArray());

        mockMvc.perform(
                        post("/api/v1/agent/workspaces/ws-stub/rooms")
                                .with(developer())
                                .contentType(json())
                                .content(ROOM_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modelId").isString())
                .andExpect(jsonPath("$.data.teamTemplateId").isString());

        mockMvc.perform(get("/api/v1/agent/rooms/room-stub").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("room-stub"))
                .andExpect(jsonPath("$.data.fileRoot").isString());

        mockMvc.perform(
                        put("/api/v1/agent/rooms/room-stub")
                                .with(developer())
                                .contentType(json())
                                .content(ROOM_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.updatedAt").isString());

        mockMvc.perform(delete("/api/v1/agent/rooms/room-stub").with(developer()))
                .andExpect(status().isOk());
    }
}
