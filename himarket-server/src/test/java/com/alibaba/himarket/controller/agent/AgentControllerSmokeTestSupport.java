package com.alibaba.himarket.controller.agent;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.web.SecurityFilterChain;

abstract class AgentControllerSmokeTestSupport {

    static final String WORKSPACE_BODY =
            "{\"name\":\"Workspace\",\"description\":\"desc\","
                    + "\"defaultTeamTemplateId\":\"team-template-stub\"}";
    static final String ROOM_BODY =
            "{\"name\":\"Room\",\"teamTemplateId\":\"team-template-stub\","
                    + "\"modelId\":\"qwen-plus\",\"description\":\"desc\"}";
    static final String CONFIG_BODY =
            "{\"roomId\":\"room-stub\",\"modelId\":\"qwen-plus\","
                    + "\"teamTemplateId\":\"team-template-stub\","
                    + "\"skillBindings\":[{\"productId\":\"skill-code-review\","
                    + "\"version\":\"1.0.0\",\"status\":\"ACTIVE\"}],"
                    + "\"mcpBindings\":[{\"productId\":\"mcp-filesystem\","
                    + "\"version\":\"1.0.0\",\"status\":\"ACTIVE\"}],"
                    + "\"permission\":{\"readonly\":false,\"allowedUserIds\":[\"agent-user\"]}}";
    static final String BINDING_BODY =
            "{\"kind\":\"SKILL\",\"productId\":\"skill-code-review\",\"version\":\"1.0.0\"}";
    static final String TASK_BODY =
            "{\"prompt\":\"Summarize the workspace\",\"files\":[\"README.md\"],\"mode\":\"task\"}";

    static SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor developer() {
        return SecurityMockMvcRequestPostProcessors.user("agent-user").roles("DEVELOPER");
    }

    static MediaType json() {
        return MediaType.APPLICATION_JSON;
    }

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {

        @Bean
        SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
            return http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .build();
        }
    }
}
