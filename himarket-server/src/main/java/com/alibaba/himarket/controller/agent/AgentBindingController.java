package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.agent.CreateBindingParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.service.agent.AgentBindingService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent")
@Validated
@DeveloperAuth
@RequiredArgsConstructor
public class AgentBindingController {

    private final AgentBindingService bindingService;

    @GetMapping("/rooms/{id}/bindings")
    public List<AgentBindingResult> listBindings(@PathVariable String id) {
        return bindingService.listBindings(currentUserId(), id);
    }

    @PostMapping("/rooms/{id}/bindings")
    public AgentBindingResult createBinding(
            @PathVariable String id, @Valid @RequestBody CreateBindingParam param) {
        return bindingService.createBinding(currentUserId(), id, param);
    }

    @DeleteMapping("/bindings/{bindingId}")
    public void deleteBinding(@PathVariable String bindingId) {
        bindingService.deleteBinding(currentUserId(), bindingId);
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未认证");
        }
        return authentication.getName();
    }
}
