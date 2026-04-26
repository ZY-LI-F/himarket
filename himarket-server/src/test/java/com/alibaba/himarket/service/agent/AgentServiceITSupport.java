package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.BindingRefParam;
import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.RoomPermissionParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.repository.agent.AgentBindingRepository;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentTaskRunRepository;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import com.alibaba.himarket.service.ConsumerService;
import com.alibaba.himarket.service.McpServerService;
import com.alibaba.himarket.service.ProductService;
import com.alibaba.himarket.service.SkillService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(classes = AgentServiceITSupport.AgentServiceTestApplication.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Sql(scripts = "classpath:db/migration/V1_010__agent_workspace.sql")
@TestPropertySource(
        properties = {
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=none",
            "spring.jpa.open-in-view=false",
            "hiclaw.bridge.mode=mock"
        })
abstract class AgentServiceITSupport {

    static final String USER_ID = "agent-user";
    static final String OTHER_USER_ID = "other-user";

    @Container
    static final MySQLContainer<?> MYSQL =
            new MySQLContainer<>("mysql:8")
                    .withDatabaseName("himarket_agent")
                    .withUsername("test")
                    .withPassword("test");

    @Autowired AgentWorkspaceRepository workspaceRepository;
    @Autowired AgentRoomRepository roomRepository;
    @Autowired AgentRoomConfigRepository roomConfigRepository;
    @Autowired AgentBindingRepository bindingRepository;
    @Autowired AgentTaskRunRepository taskRunRepository;
    @MockBean ProductService productService;
    @MockBean SkillService skillService;
    @MockBean McpServerService mcpServerService;
    @MockBean ConsumerService consumerService;
    @MockBean AgentNacosSyncService nacosSyncService;

    @DynamicPropertySource
    static void mysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }

    @BeforeEach
    void resetTables() {
        taskRunRepository.deleteAllInBatch();
        bindingRepository.deleteAllInBatch();
        roomConfigRepository.deleteAllInBatch();
        roomRepository.deleteAllInBatch();
        workspaceRepository.deleteAllInBatch();
        authenticate(USER_ID);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    void authenticate(String userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                "n/a",
                                List.of(new SimpleGrantedAuthority("ROLE_DEVELOPER"))));
    }

    CreateWorkspaceParam createWorkspaceParam(String name) {
        CreateWorkspaceParam param = new CreateWorkspaceParam();
        param.setName(name);
        param.setDescription(name + " description");
        param.setDefaultTeamTemplateId("dev-team-v1");
        return param;
    }

    UpdateWorkspaceParam updateWorkspaceParam(String name) {
        UpdateWorkspaceParam param = new UpdateWorkspaceParam();
        param.setName(name);
        param.setDescription(name + " updated");
        param.setDefaultTeamTemplateId("dev-team-v1");
        return param;
    }

    CreateRoomParam createRoomParam(String name) {
        CreateRoomParam param = new CreateRoomParam();
        param.setName(name);
        param.setModelId("qwen-plus");
        param.setTeamTemplateId("dev-team-v1");
        param.setDescription(name + " description");
        return param;
    }

    UpdateRoomParam updateRoomParam(String name) {
        UpdateRoomParam param = new UpdateRoomParam();
        param.setName(name);
        param.setModelId("qwen-max");
        param.setTeamTemplateId("dev-team-v1");
        param.setDescription(name + " updated");
        return param;
    }

    UpdateRoomConfigParam roomConfigParam(String roomId, String modelId) {
        UpdateRoomConfigParam param = new UpdateRoomConfigParam();
        param.setRoomId(roomId);
        param.setModelId(modelId);
        param.setTeamTemplateId("dev-team-v1");
        param.setSkillBindings(List.of(binding("skill-code-review")));
        param.setMcpBindings(List.of(binding("mcp-filesystem")));
        param.setPermission(permission());
        return param;
    }

    private BindingRefParam binding(String productId) {
        BindingRefParam param = new BindingRefParam();
        param.setProductId(productId);
        param.setVersion("1.0.0");
        param.setStatus("ACTIVE");
        return param;
    }

    private RoomPermissionParam permission() {
        RoomPermissionParam param = new RoomPermissionParam();
        param.setReadonly(Boolean.FALSE);
        param.setAllowedUserIds(List.of(USER_ID));
        return param;
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan("com.alibaba.himarket.entity.agent")
    @EnableJpaRepositories("com.alibaba.himarket.repository.agent")
    @ComponentScan(
            basePackages = {
                "com.alibaba.himarket.dto.converter.agent",
                "com.alibaba.himarket.service.agent"
            })
    static class AgentServiceTestApplication {}
}
