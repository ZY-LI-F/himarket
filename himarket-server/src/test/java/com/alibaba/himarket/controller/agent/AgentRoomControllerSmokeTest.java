package com.alibaba.himarket.controller.agent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ResponseAdvice;
import com.alibaba.himarket.service.agent.AgentRoomService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentRoomController.class)
@Import({ResponseAdvice.class, AgentControllerSmokeTestSupport.TestSecurityConfig.class})
class AgentRoomControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;
    @MockBean private AgentRoomService roomService;

    @BeforeEach
    void setUpService() {
        when(roomService.listRooms(eq("agent-user"), eq("ws-stub")))
                .thenReturn(List.of(AgentStubResponses.room("ws-stub", "room-stub", "agent-user")));
        when(roomService.createRoom(eq("agent-user"), eq("ws-stub"), any()))
                .thenReturn(AgentStubResponses.room("ws-stub", "room-created", "agent-user"));
        when(roomService.getRoom(eq("agent-user"), eq("room-stub")))
                .thenReturn(AgentStubResponses.room("ws-stub", "room-stub", "agent-user"));
        when(roomService.updateRoom(eq("agent-user"), eq("room-stub"), any()))
                .thenReturn(AgentStubResponses.room("ws-stub", "room-stub", "agent-user"));
    }

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
