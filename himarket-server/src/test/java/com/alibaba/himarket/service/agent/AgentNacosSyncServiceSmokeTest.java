package com.alibaba.himarket.service.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.dto.converter.agent.AgentBindingConverter;
import com.alibaba.himarket.dto.converter.agent.AgentRoomConfigConverter;
import com.alibaba.himarket.dto.converter.agent.AgentRoomConverter;
import com.alibaba.himarket.dto.converter.agent.AgentWorkspaceConverter;
import com.alibaba.himarket.dto.params.agent.BindingRefParam;
import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.RoomPermissionParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.dto.result.common.VersionResult;
import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.product.ProductResult;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import com.alibaba.himarket.entity.agent.AgentTeamTemplateEntity;
import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import com.alibaba.himarket.repository.agent.AgentBindingRepository;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentTeamTemplateRepository;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import com.alibaba.himarket.service.ConsumerService;
import com.alibaba.himarket.service.McpServerService;
import com.alibaba.himarket.service.ProductService;
import com.alibaba.himarket.service.SkillService;
import com.alibaba.himarket.service.agent.impl.AgentBindingServiceImpl;
import com.alibaba.himarket.service.agent.impl.AgentNacosSyncServiceImpl;
import com.alibaba.himarket.service.agent.impl.AgentRoomConfigServiceImpl;
import com.alibaba.himarket.service.agent.impl.AgentRoomServiceImpl;
import com.alibaba.himarket.service.agent.impl.AgentWorkspaceServiceImpl;
import com.alibaba.himarket.support.enums.ProductType;
import com.alibaba.himarket.support.enums.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(classes = AgentNacosSyncServiceSmokeTest.TestApplication.class)
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:agent_nacos_sync;MODE=MySQL;DATABASE_TO_UPPER=false;DB_CLOSE_DELAY=-1",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.jpa.open-in-view=false",
            "spring.flyway.enabled=false"
        })
class AgentNacosSyncServiceSmokeTest {

    private static final String USER_ID = "agent-user";
    private static final String PRODUCT_ID = "skill-code-review";
    private static final String VERSION = "1.0.0";
    private static final String CONSUMER_ID = "consumer-agent-user";

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentRoomConfigService roomConfigService;
    @Autowired private AgentBindingService bindingService;
    @Autowired private AgentNacosSyncService nacosSyncService;
    @Autowired private MockNacosConfigService nacosConfigService;
    @Autowired private AgentWorkspaceRepository workspaceRepository;
    @Autowired private AgentRoomRepository roomRepository;
    @Autowired private AgentRoomConfigRepository roomConfigRepository;
    @Autowired private AgentTeamTemplateRepository teamTemplateRepository;
    @Autowired private AgentBindingRepository bindingRepository;

    @MockBean private ProductService productService;
    @MockBean private SkillService skillService;
    @MockBean private McpServerService mcpServerService;
    @MockBean private ConsumerService consumerService;
    @MockBean private HiClawBridgeClient hiClawBridgeClient;

    @BeforeEach
    void setUp() {
        bindingRepository.deleteAllInBatch();
        roomConfigRepository.deleteAllInBatch();
        roomRepository.deleteAllInBatch();
        workspaceRepository.deleteAllInBatch();
        teamTemplateRepository.deleteAllInBatch();
        nacosConfigService.clear();
        authenticate(USER_ID);
        seedTeamTemplate();
        stubApprovedSkillBinding();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publishesFourDataIdsOnSaveAndRestoresWorkspaceRows() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, workspaceParam("Workspace"));
        AgentRoomResult room =
                roomService.createRoom(USER_ID, workspace.getId(), roomParam("Room"));
        AgentRoomConfigResult config =
                roomConfigService.updateRoomConfig(
                        USER_ID, room.getId(), roomConfigParam(room.getId()));
        AgentBindingResult binding =
                bindingService.createBinding(USER_ID, room.getId(), bindingParam());

        assertThat(nacosConfigService.dataIds())
                .containsExactlyInAnyOrder(
                        AgentNacosSyncService.WORKSPACE_LIST_DATA_ID,
                        AgentNacosSyncService.TEAM_TEMPLATE_LIST_DATA_ID,
                        AgentNacosSyncService.roomConfigDataId(room.getId()),
                        AgentNacosSyncService.skillBindingDataId(room.getId()));
        assertThat(nacosConfigService.get(AgentNacosSyncService.roomConfigDataId(room.getId())))
                .contains(config.getModelId());
        assertThat(nacosConfigService.get(AgentNacosSyncService.skillBindingDataId(room.getId())))
                .contains(binding.getProductId());

        removeAgentRows();
        nacosSyncService.restoreWorkspace(USER_ID, workspace.getId());

        AgentWorkspaceEntity restoredWorkspace =
                workspaceRepository.findByWorkspaceUid(workspace.getId()).orElseThrow();
        AgentRoomEntity restoredRoom = roomRepository.findByRoomUid(room.getId()).orElseThrow();
        AgentRoomConfigEntity restoredConfig =
                roomConfigRepository.findByRoomUid(room.getId()).orElseThrow();
        AgentBindingEntity restoredBinding =
                bindingRepository.findByBindingUid(binding.getId()).orElseThrow();

        assertThat(restoredWorkspace.getName()).isEqualTo("Workspace");
        assertThat(restoredRoom.getWorkspaceUid()).isEqualTo(workspace.getId());
        assertThat(restoredRoom.getModelId()).isEqualTo(config.getModelId());
        assertThat(restoredConfig.getConfigJson()).contains(config.getModelId());
        assertThat(restoredBinding.getRoomUid()).isEqualTo(room.getId());
        assertThat(restoredBinding.getProductId()).isEqualTo(PRODUCT_ID);
        assertThat(teamTemplateRepository.findByTemplateId("dev-team-v1")).isPresent();
    }

    private void removeAgentRows() {
        bindingRepository.deleteAllInBatch();
        roomConfigRepository.deleteAllInBatch();
        roomRepository.deleteAllInBatch();
        workspaceRepository.deleteAllInBatch();
        teamTemplateRepository.deleteAllInBatch();
    }

    private void authenticate(String userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                "n/a",
                                List.of(new SimpleGrantedAuthority("ROLE_DEVELOPER"))));
    }

    private void seedTeamTemplate() {
        teamTemplateRepository.saveAndFlush(
                AgentTeamTemplateEntity.builder()
                        .templateId("dev-team-v1")
                        .name("Dev Team")
                        .version(VERSION)
                        .managerProfileJson("{\"role\":\"manager\"}")
                        .workersProfileJson("[{\"role\":\"coder\"}]")
                        .defaultSkills("[]")
                        .defaultMcps("[]")
                        .createdAt(LocalDateTime.now())
                        .build());
    }

    private CreateWorkspaceParam workspaceParam(String name) {
        CreateWorkspaceParam param = new CreateWorkspaceParam();
        param.setName(name);
        param.setDescription(name + " description");
        param.setDefaultTeamTemplateId("dev-team-v1");
        return param;
    }

    private CreateRoomParam roomParam(String name) {
        CreateRoomParam param = new CreateRoomParam();
        param.setName(name);
        param.setModelId("qwen-plus");
        param.setTeamTemplateId("dev-team-v1");
        param.setDescription(name + " description");
        return param;
    }

    private UpdateRoomConfigParam roomConfigParam(String roomId) {
        UpdateRoomConfigParam param = new UpdateRoomConfigParam();
        param.setRoomId(roomId);
        param.setModelId("qwen-max");
        param.setTeamTemplateId("dev-team-v1");
        param.setSkillBindings(List.of(bindingRef(PRODUCT_ID)));
        param.setMcpBindings(List.of(bindingRef("mcp-filesystem")));
        param.setPermission(permission());
        return param;
    }

    private BindingRefParam bindingRef(String productId) {
        BindingRefParam param = new BindingRefParam();
        param.setProductId(productId);
        param.setVersion(VERSION);
        param.setStatus("ACTIVE");
        return param;
    }

    private RoomPermissionParam permission() {
        RoomPermissionParam param = new RoomPermissionParam();
        param.setReadonly(Boolean.FALSE);
        param.setAllowedUserIds(List.of(USER_ID));
        return param;
    }

    private CreateBindingParam bindingParam() {
        CreateBindingParam param = new CreateBindingParam();
        param.setKind("SKILL");
        param.setProductId(PRODUCT_ID);
        param.setVersion(VERSION);
        return param;
    }

    private void stubApprovedSkillBinding() {
        ProductResult product = new ProductResult();
        product.setProductId(PRODUCT_ID);
        product.setType(ProductType.AGENT_SKILL);
        when(productService.getProducts(List.of(PRODUCT_ID)))
                .thenReturn(Map.of(PRODUCT_ID, product));
        when(skillService.listVersions(PRODUCT_ID))
                .thenReturn(List.of(VersionResult.builder().version(VERSION).build()));

        ConsumerResult consumer = new ConsumerResult();
        consumer.setConsumerId(CONSUMER_ID);
        when(consumerService.getPrimaryConsumer(USER_ID)).thenReturn(consumer);

        SubscriptionResult subscription = new SubscriptionResult();
        subscription.setProductId(PRODUCT_ID);
        subscription.setStatus(SubscriptionStatus.APPROVED.name());
        when(consumerService.listConsumerSubscriptions(CONSUMER_ID))
                .thenReturn(List.of(subscription));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan("com.alibaba.himarket.entity.agent")
    @EnableJpaRepositories("com.alibaba.himarket.repository.agent")
    @ComponentScan(
            basePackageClasses = {
                AgentWorkspaceConverter.class,
                AgentRoomConverter.class,
                AgentRoomConfigConverter.class,
                AgentBindingConverter.class,
                AgentWorkspaceServiceImpl.class,
                AgentRoomServiceImpl.class,
                AgentRoomConfigServiceImpl.class,
                AgentBindingServiceImpl.class,
                AgentNacosSyncServiceImpl.class
            })
    @Import(MockNacosConfig.class)
    static class TestApplication {}

    @TestConfiguration
    static class MockNacosConfig {

        @Bean
        MockNacosConfigService mockNacosConfigService() {
            return new MockNacosConfigService();
        }
    }

    static class MockNacosConfigService implements AgentNacosConfigClient {

        private final Map<String, String> configs = new ConcurrentHashMap<>();

        @Override
        public void publish(String dataId, String content) {
            configs.put(dataId, content);
        }

        @Override
        public String get(String dataId) {
            return configs.get(dataId);
        }

        Set<String> dataIds() {
            return configs.keySet();
        }

        void clear() {
            configs.clear();
        }
    }
}
