package com.alibaba.himarket.controller.portal;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.params.consumer.CreateSubscriptionParam;
import com.alibaba.himarket.dto.result.product.SubscriptionResult;
import com.alibaba.himarket.service.WorkerTeamProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/portal/subscriptions")
@Validated
@RequiredArgsConstructor
public class WorkerTeamSubscriptionPortalController {

    private final WorkerTeamProductService service;

    @PostMapping("/team")
    @DeveloperAuth
    public SubscriptionResult subscribeWorkerTeamProduct(
            @Valid @RequestBody CreateSubscriptionParam param) {
        return service.subscribeWorkerTeamProduct(param);
    }
}
