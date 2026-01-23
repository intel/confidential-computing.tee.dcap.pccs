# Copyright (c) 2024-2025 Intel Corporation
# SPDX-License-Identifier: BSD-3-Clause

# Declare nodejs version you want to use
ARG NODE_VERSION=20.12.2

# Declare directories when source will be copied and service will be built
# this need to match the directory location in the cloned source layout
ARG SRC_OUTPUT_DIR=/pccs
ARG BUILD_OUTPUT_DIR=${SRC_OUTPUT_DIR}/service

# Use multi-stage builds to reduce final image size
FROM docker.io/library/debian:12 AS builder

# Define arguments used across multiple stages
ARG DCAP_VERSION=DCAP_1.24
ARG SRC_LOCATION=https://github.com/intel/confidential-computing.tee.dcap.pccs.git
ARG NODE_VERSION

# update and install packages, nodejs
RUN DEBIAN_FRONTEND=noninteractive \
    apt-get update -yq \
    && apt-get upgrade -yq \
    && apt-get install -yq --no-install-recommends \
        ca-certificates \
        curl \
        git \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install nvm (Node Version Manager)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Set NVM_DIR so we can use it in subsequent commands
ENV NVM_DIR=/root/.nvm

# Set NODE_ENV to production
ENV NODE_ENV=production

# Install specific version of Node using nvm
# Source nvm in each RUN command to ensure it's available
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm use $NODE_VERSION

# Set PATH to include the node and npm binaries
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Clone the specific branch or tag
ARG SRC_OUTPUT_DIR
ARG CLONE_FLAGS="-b ${DCAP_VERSION} --depth 1"
RUN git clone ${CLONE_FLAGS} ${SRC_LOCATION} ${SRC_OUTPUT_DIR}

# Build PCCS
ARG BUILD_OUTPUT_DIR
WORKDIR $BUILD_OUTPUT_DIR
RUN npm config set proxy $http_proxy \
    && npm config set https-proxy $https_proxy \
    && npm config set engine-strict true \
    && npm install

# Start final image build
FROM docker.io/library/debian:12-slim

ARG NODE_VERSION
# Set NODE_ENV to production
ENV NODE_ENV=production

# Create user and group before copying files
ARG USER=pccs
ARG GROUP=${USER}
# Unique default UID to avoid conflicts
ARG UID=70636373
ARG GID=${UID}
RUN groupadd --gid ${GID} ${GROUP} && useradd --no-create-home --uid ${UID} --gid ${GID} --system ${USER} --shell /bin/false

# Creating directory for DB
ARG DATA_DIR=/data
VOLUME [ "${DATA_DIR}" ]
RUN mkdir -p ${DATA_DIR} && chown -R ${USER}:${GROUP} ${DATA_DIR}

# Copy only necessary files from builder stage
ARG BUILD_OUTPUT_DIR
ARG TARGET_DIR=/opt/intel/pccs/
COPY --from=builder /root/.nvm/versions/node/v$NODE_VERSION/bin/node /usr/bin/node
COPY --from=builder --chown=${USER}:${GROUP} $BUILD_OUTPUT_DIR $TARGET_DIR

# Set the working directory and switch user
WORKDIR $TARGET_DIR
USER ${USER}

# Define entrypoint
ENTRYPOINT ["/usr/bin/node", "pccs_server.js"]
