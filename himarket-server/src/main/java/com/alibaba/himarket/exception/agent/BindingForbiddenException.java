package com.alibaba.himarket.exception.agent;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BindingForbiddenException extends RuntimeException {

    private static final String CODE = "BINDING_FORBIDDEN";
    private static final HttpStatus STATUS = HttpStatus.FORBIDDEN;

    private final String code = CODE;
    private final HttpStatus status = STATUS;

    public BindingForbiddenException(String message) {
        super(message);
    }
}
