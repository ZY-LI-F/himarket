package com.alibaba.himarket.controller.agent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alibaba.himarket.core.advice.ExceptionAdvice;
import com.alibaba.himarket.core.advice.ResponseAdvice;
import com.alibaba.himarket.exception.agent.BindingForbiddenException;
import com.alibaba.himarket.service.agent.AgentBindingService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentBindingController.class)
@Import({
    ResponseAdvice.class,
    ExceptionAdvice.class,
    AgentControllerSmokeTestSupport.TestSecurityConfig.class
})
class AgentBindingControllerSmokeTest extends AgentControllerSmokeTestSupport {

    @Autowired private MockMvc mockMvc;
    @MockBean private AgentBindingService bindingService;

    @BeforeEach
    void setUpService() {
        when(bindingService.listBindings(eq("agent-user"), eq("room-stub")))
                .thenReturn(List.of(AgentStubResponses.binding("room-stub")));
        when(bindingService.createBinding(eq("agent-user"), eq("room-stub"), any()))
                .thenReturn(AgentStubResponses.binding("room-stub"));
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/bindings"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void bindingEndpointsReturnBindingShape() throws Exception {
        mockMvc.perform(get("/api/v1/agent/rooms/room-stub/bindings").with(developer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").isString())
                .andExpect(jsonPath("$.data[0].kind").value("SKILL"))
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data[0].createdAt").isString());

        mockMvc.perform(
                        post("/api/v1/agent/rooms/room-stub/bindings")
                                .with(developer())
                                .contentType(json())
                                .content(BINDING_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").isString())
                .andExpect(jsonPath("$.data.version").isString());

        mockMvc.perform(delete("/api/v1/agent/bindings/binding-stub").with(developer()))
                .andExpect(status().isOk());
    }

    @Test
    void bindingForbiddenMapsToForbiddenResponse() throws Exception {
        when(bindingService.createBinding(eq("agent-user"), eq("room-stub"), any()))
                .thenThrow(new BindingForbiddenException("approved subscription is required"));

        mockMvc.perform(
                        post("/api/v1/agent/rooms/room-stub/bindings")
                                .with(developer())
                                .contentType(json())
                                .content(BINDING_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("BINDING_FORBIDDEN"));
    }
}
