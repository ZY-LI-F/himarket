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
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.dto.result.common.VersionResult;
import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.product.ProductResult;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.entity.agent.AgentTeamTemplateEntity;
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
import com.alibaba.nacos.api.PropertyKeyConst;
import com.alibaba.nacos.api.config.ConfigFactory;
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.maintainer.client.naming.NamingMaintainerFactory;
import com.alibaba.nacos.maintainer.client.naming.NamingMaintainerService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Properties;
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
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@SpringBootTest(classes = AgentNacosSyncServiceIT.TestApplication.class)
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:agent_nacos_sync_it;MODE=MySQL;DATABASE_TO_UPPER=false;DB_CLOSE_DELAY=-1",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.jpa.open-in-view=false",
            "spring.flyway.enabled=false"
        })
class AgentNacosSyncServiceIT {

    private static final String USER_ID = "agent-user";
    private static final String PRODUCT_ID = "skill-code-review";
    private static final String VERSION = "1.0.0";
    private static final String CONSUMER_ID = "consumer-agent-user";
    private static final String NAMESPACE_ID = "agent-workspace";
    private static final String GROUP = "AGENT_WORKSPACE";

    @Container
    static final GenericContainer<?> NACOS =
            new GenericContainer<>(DockerImageName.parse("nacos/nacos-server:v3.2.1"))
                    .withExposedPorts(8848)
                    .withEnv("MODE", "standalone")
                    .withEnv("NACOS_AUTH_ENABLE", "false")
                    .waitingFor(
                            Wait.forHttp("/nacos/v3/console/health/liveness")
                                    .forPort(8848)
                                    .forStatusCode(200)
                                    .withStartupTimeout(Duration.ofMinutes(3)));

    @Autowired private AgentWorkspaceService workspaceService;
    @Autowired private AgentRoomService roomService;
    @Autowired private AgentRoomConfigService roomConfigService;
    @Autowired private AgentBindingService bindingService;
    @Autowired private AgentNacosSyncService nacosSyncService;
    @Autowired private AgentNacosConfigClient nacosConfigClient;
    @Autowired private AgentWorkspaceRepository workspaceRepository;
    @Autowired private AgentRoomRepository roomRepository;
    @Autowired private AgentRoomConfigRepository roomConfigRepository;
    @Autowired private AgentTeamTemplateRepository teamTemplateRepository;
    @Autowired private AgentBindingRepository bindingRepository;

    @MockBean private ProductService productService;
    @MockBean private SkillService skillService;
    @MockBean private McpServerService mcpServerService;
    @MockBean private ConsumerService consumerService;

    @BeforeEach
    void setUp() {
        bindingRepository.deleteAllInBatch();
        roomConfigRepository.deleteAllInBatch();
        roomRepository.deleteAllInBatch();
        workspaceRepository.deleteAllInBatch();
        teamTemplateRepository.deleteAllInBatch();
        authenticate(USER_ID);
        seedTeamTemplate();
        stubApprovedSkillBinding();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publishesToNacosAndRestoresWorkspaceRows() {
        AgentWorkspaceResult workspace =
                workspaceService.createWorkspace(USER_ID, workspaceParam("Workspace"));
        AgentRoomResult room =
                roomService.createRoom(USER_ID, workspace.getId(), roomParam("Room"));
        roomConfigService.updateRoomConfig(USER_ID, room.getId(), roomConfigParam(room.getId()));
        AgentBindingResult binding =
                bindingService.createBinding(USER_ID, room.getId(), bindingParam());

        assertThat(nacosConfigClient.get(AgentNacosSyncService.WORKSPACE_LIST_DATA_ID))
                .contains(workspace.getId());
        assertThat(nacosConfigClient.get(AgentNacosSyncService.roomConfigDataId(room.getId())))
                .contains(room.getId());
        assertThat(nacosConfigClient.get(AgentNacosSyncService.skillBindingDataId(room.getId())))
                .contains(binding.getProductId());

        removeAgentRows();
        nacosSyncService.restoreWorkspace(USER_ID, workspace.getId());

        assertThat(workspaceRepository.findByWorkspaceUid(workspace.getId())).isPresent();
        assertThat(roomRepository.findByRoomUid(room.getId())).isPresent();
        assertThat(roomConfigRepository.findByRoomUid(room.getId())).isPresent();
        assertThat(bindingRepository.findByBindingUid(binding.getId())).isPresent();
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
    @Import(NacosTestConfig.class)
    static class TestApplication {}

    @TestConfiguration
    static class NacosTestConfig {

        @Bean
        AgentNacosConfigClient agentNacosConfigClient() {
            return new TestcontainersNacosConfigClient();
        }
    }

    static class TestcontainersNacosConfigClient implements AgentNacosConfigClient {

        private final ConfigService configService;

        TestcontainersNacosConfigClient() {
            try {
                Properties properties = nacosProperties("");
                NamingMaintainerService namingService =
                        NamingMaintainerFactory.createNamingMaintainerService(properties);
                if (!Boolean.TRUE.equals(namingService.checkNamespaceIdExist(NAMESPACE_ID))) {
                    namingService.createNamespace(
                            NAMESPACE_ID, NAMESPACE_ID, "HiMarket agent workspace snapshots");
                }
                configService = ConfigFactory.createConfigService(nacosProperties(NAMESPACE_ID));
            } catch (NacosException e) {
                throw new IllegalStateException("Failed to initialize Nacos test client", e);
            }
        }

        @Override
        public void publish(String dataId, String content) {
            try {
                boolean ok = configService.publishConfig(dataId, GROUP, content, "json");
                if (!ok) {
                    throw new IllegalStateException("Nacos returned false for " + dataId);
                }
            } catch (NacosException e) {
                throw new IllegalStateException("Failed to publish " + dataId, e);
            }
        }

        @Override
        public String get(String dataId) {
            try {
                return configService.getConfig(dataId, GROUP, 3000L);
            } catch (NacosException e) {
                throw new IllegalStateException("Failed to read " + dataId, e);
            }
        }

        private Properties nacosProperties(String namespaceId) {
            Properties properties = new Properties();
            properties.setProperty(
                    PropertyKeyConst.SERVER_ADDR,
                    NACOS.getHost() + ":" + NACOS.getMappedPort(8848));
            properties.setProperty(PropertyKeyConst.CONTEXT_PATH, "nacos");
            properties.setProperty(PropertyKeyConst.NAMESPACE, namespaceId);
            return properties;
        }
    }
}
