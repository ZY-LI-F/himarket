package com.alibaba.himarket.security.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.alibaba.himarket.dto.result.consumer.ConsumerResult;
import com.alibaba.himarket.dto.result.consumer.CredentialContext;
import com.alibaba.himarket.dto.result.httpapi.HttpRouteResult;
import com.alibaba.himarket.dto.result.model.ModelConfigResult;
import com.alibaba.himarket.dto.result.product.ProductResult;
import com.alibaba.himarket.entity.McpServerEndpoint;
import com.alibaba.himarket.entity.McpServerMeta;
import com.alibaba.himarket.entity.Product;
import com.alibaba.himarket.entity.ProductSubscription;
import com.alibaba.himarket.repository.McpServerEndpointRepository;
import com.alibaba.himarket.repository.McpServerMetaRepository;
import com.alibaba.himarket.repository.ProductRepository;
import com.alibaba.himarket.repository.SubscriptionRepository;
import com.alibaba.himarket.service.ConsumerService;
import com.alibaba.himarket.service.GatewayService;
import com.alibaba.himarket.service.hichat.manager.ChatBotManager;
import com.alibaba.himarket.service.hichat.service.OpenAILlmService;
import com.alibaba.himarket.service.hichat.support.InvokeModelParam;
import com.alibaba.himarket.service.hichat.support.LlmChatRequest;
import com.alibaba.himarket.service.mcp.McpTransportResolver;
import com.alibaba.himarket.support.chat.mcp.MCPTransportConfig;
import com.alibaba.himarket.support.enums.AIProtocol;
import com.alibaba.himarket.support.enums.McpEndpointStatus;
import com.alibaba.himarket.support.enums.McpHostingType;
import com.alibaba.himarket.support.enums.ProductType;
import com.alibaba.himarket.support.enums.SubscriptionStatus;
import com.alibaba.himarket.support.product.ModelFeature;
import com.alibaba.himarket.support.product.ProductFeature;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

class AgentEgressHostHeaderTest {

    private static final String USER_ID = "agent-user";
    private static final String CONSUMER_ID = "consumer-agent-user";
    private static final String MODEL_PRODUCT_ID = "model-openai";
    private static final String MCP_PRODUCT_ID = "mcp-filesystem";
    private static final String MCP_SERVER_ID = "mcp-server-filesystem";
    private static final String HIGRESS_UPSTREAM = "higress-gateway.default.svc.cluster.local";
    private static final String HIGRESS_GATEWAY_URL = "http://" + HIGRESS_UPSTREAM;

    @Test
    void capturedLlmAndMcpRequestsCarryHigressHostHeader() {
        LlmChatRequest llmRequest = composeOpenAiRequest();
        MCPTransportConfig mcpConfig = resolveMcpTransportConfig();

        List<ClientRequest> captured = submitOneTask(llmRequest, mcpConfig);

        assertThat(captured).hasSize(2);
        assertThat(captured)
                .allSatisfy(
                        request ->
                                assertThat(request.headers().getFirst(HttpHeaders.HOST))
                                        .startsWith(HIGRESS_UPSTREAM));
        assertThat(captured)
                .extracting(request -> request.url().getPath())
                .contains("/v1", "/mcp/sse");
    }

    private LlmChatRequest composeOpenAiRequest() {
        GatewayService gatewayService = mock(GatewayService.class);
        when(gatewayService.fetchGatewayUris("gateway-higress"))
                .thenReturn(List.of(URI.create(HIGRESS_GATEWAY_URL)));

        ExposedOpenAILlmService llmService =
                new ExposedOpenAILlmService(gatewayService, mock(ChatBotManager.class));

        return llmService.compose(
                InvokeModelParam.builder()
                        .chatId("chat-1")
                        .sessionId("session-1")
                        .gatewayId("gateway-higress")
                        .product(modelProduct())
                        .credentialContext(
                                CredentialContext.builder()
                                        .apiKey("test-api-key")
                                        .headers(Map.of("Authorization", "Bearer test-api-key"))
                                        .build())
                        .build());
    }

    private ProductResult modelProduct() {
        ProductResult product = new ProductResult();
        product.setProductId(MODEL_PRODUCT_ID);
        product.setType(ProductType.MODEL_API);
        product.setFeature(
                ProductFeature.builder()
                        .modelFeature(ModelFeature.builder().model("gpt-test").build())
                        .build());

        HttpRouteResult route = new HttpRouteResult();
        route.setDomains(List.of());
        route.setMatch(
                HttpRouteResult.RouteMatchResult.builder()
                        .path(
                                HttpRouteResult.RouteMatchPath.builder()
                                        .type("Exact")
                                        .value("/v1/chat/completions")
                                        .build())
                        .build());

        ModelConfigResult modelConfig = new ModelConfigResult();
        modelConfig.setModelAPIConfig(
                ModelConfigResult.ModelAPIConfig.builder()
                        .aiProtocols(List.of(AIProtocol.OPENAI.getProtocol()))
                        .routes(List.of(route))
                        .build());
        product.setModelConfig(modelConfig);
        return product;
    }

    private MCPTransportConfig resolveMcpTransportConfig() {
        McpServerMetaRepository metaRepository = mock(McpServerMetaRepository.class);
        McpServerEndpointRepository endpointRepository = mock(McpServerEndpointRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
        ConsumerService consumerService = mock(ConsumerService.class);

        ConsumerResult consumer = new ConsumerResult();
        consumer.setConsumerId(CONSUMER_ID);
        when(consumerService.getPrimaryConsumer(USER_ID)).thenReturn(consumer);
        when(consumerService.getDefaultCredential(USER_ID))
                .thenReturn(
                        CredentialContext.builder()
                                .apiKey("test-api-key")
                                .headers(Map.of("Authorization", "Bearer test-api-key"))
                                .build());

        when(subscriptionRepository.findByConsumerIdAndProductIdIn(
                        eq(CONSUMER_ID), eq(List.of(MCP_PRODUCT_ID))))
                .thenReturn(List.of(subscription()));
        when(metaRepository.findByProductIdIn(eq(List.of(MCP_PRODUCT_ID))))
                .thenReturn(List.of(mcpMeta()));
        when(endpointRepository.findByMcpServerIdInAndUserIdInAndStatus(
                        anyList(),
                        eq(List.of(USER_ID, McpEndpointStatus.PUBLIC_USER_ID)),
                        eq(McpEndpointStatus.ACTIVE.name())))
                .thenReturn(List.of(mcpEndpoint()));
        when(productRepository.findByProductIdIn(eq(List.of(MCP_PRODUCT_ID))))
                .thenReturn(List.of(mcpProduct()));

        McpTransportResolver resolver =
                new McpTransportResolver(
                        metaRepository,
                        endpointRepository,
                        productRepository,
                        subscriptionRepository);
        ReflectionTestUtils.setField(resolver, "consumerService", consumerService);

        return resolver.resolveTransportConfigs(List.of(MCP_PRODUCT_ID), USER_ID).get(0);
    }

    private ProductSubscription subscription() {
        return ProductSubscription.builder()
                .consumerId(CONSUMER_ID)
                .productId(MCP_PRODUCT_ID)
                .status(SubscriptionStatus.APPROVED)
                .build();
    }

    private McpServerMeta mcpMeta() {
        return McpServerMeta.builder()
                .mcpServerId(MCP_SERVER_ID)
                .productId(MCP_PRODUCT_ID)
                .mcpName("filesystem")
                .protocolType("sse")
                .origin("GATEWAY")
                .connectionConfig("{}")
                .build();
    }

    private McpServerEndpoint mcpEndpoint() {
        return McpServerEndpoint.builder()
                .endpointId("endpoint-filesystem")
                .mcpServerId(MCP_SERVER_ID)
                .mcpName("filesystem")
                .endpointUrl(HIGRESS_GATEWAY_URL + "/mcp")
                .hostingType(McpHostingType.GATEWAY.name())
                .protocol("sse")
                .userId(McpEndpointStatus.PUBLIC_USER_ID)
                .status(McpEndpointStatus.ACTIVE.name())
                .build();
    }

    private Product mcpProduct() {
        return Product.builder()
                .productId(MCP_PRODUCT_ID)
                .name("Filesystem MCP")
                .description("Filesystem MCP through Higress")
                .type(ProductType.MCP_SERVER)
                .build();
    }

    private List<ClientRequest> submitOneTask(
            LlmChatRequest llmRequest, MCPTransportConfig mcpConfig) {
        List<ClientRequest> captured = new ArrayList<>();
        ExchangeFilterFunction captureFilter =
                (request, next) -> {
                    captured.add(request);
                    return next.exchange(request);
                };
        WebClient webClient =
                WebClient.builder()
                        .filter(captureFilter)
                        .exchangeFunction(
                                request ->
                                        Mono.just(
                                                ClientResponse.create(HttpStatus.OK)
                                                        .body("{}")
                                                        .build()))
                        .build();

        webClient
                .post()
                .uri(llmRequest.getUri())
                .headers(headers -> headers.setAll(llmRequest.getHeaders()))
                .retrieve()
                .bodyToMono(String.class)
                .block();
        webClient
                .get()
                .uri(URI.create(mcpConfig.getUrl()))
                .headers(headers -> headers.setAll(mcpConfig.getHeaders()))
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return captured;
    }

    private static final class ExposedOpenAILlmService extends OpenAILlmService {
        private ExposedOpenAILlmService(
                GatewayService gatewayService, ChatBotManager chatBotManager) {
            super(gatewayService, chatBotManager);
        }

        private LlmChatRequest compose(InvokeModelParam param) {
            return super.composeRequest(param);
        }
    }
}
