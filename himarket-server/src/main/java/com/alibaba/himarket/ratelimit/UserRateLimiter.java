/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package com.alibaba.himarket.ratelimit;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

@Component
public class UserRateLimiter {

    public static final Duration DEFAULT_INTERVAL = Duration.ofSeconds(5);

    private final Clock clock;
    private final Duration interval;
    private final ConcurrentMap<String, Instant> lastAcceptedAtByUser = new ConcurrentHashMap<>();

    public UserRateLimiter() {
        this(Clock.systemUTC(), DEFAULT_INTERVAL);
    }

    public UserRateLimiter(Clock clock, Duration interval) {
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        this.interval = Objects.requireNonNull(interval, "interval must not be null");
        if (interval.isNegative() || interval.isZero()) {
            throw new IllegalArgumentException("interval must be positive");
        }
    }

    public void check(String userId) {
        if (!tryAcquire(userId)) {
            throw new BusinessException(
                    ErrorCode.RATE_LIMITED,
                    "PubMed requests are limited to one request per user every "
                            + interval.toSeconds()
                            + " seconds");
        }
    }

    public void acquire(String userId) {
        check(userId);
    }

    public boolean tryAcquire(String userId) {
        String normalizedUserId = requireText(userId, "userId");
        Instant now = clock.instant();
        AtomicBoolean allowed = new AtomicBoolean(false);
        lastAcceptedAtByUser.compute(
                normalizedUserId,
                (key, previous) -> {
                    if (previous == null || !now.isBefore(previous.plus(interval))) {
                        allowed.set(true);
                        return now;
                    }
                    return previous;
                });
        return allowed.get();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.trim();
    }
}
