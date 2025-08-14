#!/bin/bash

# Claude Squad tmux setup script
SESSION_NAME="squad"

# Check if session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists. Attaching..."
    tmux attach-session -t $SESSION_NAME
    exit 0
fi

# Create new session with main window
tmux new-session -d -s $SESSION_NAME -n "main"

# Split into 4 panes for different agents
tmux split-window -h -t $SESSION_NAME:main
tmux split-window -v -t $SESSION_NAME:main.0
tmux split-window -v -t $SESSION_NAME:main.1

# Set pane titles
tmux select-pane -t $SESSION_NAME:main.0 -T "Main Agent"
tmux select-pane -t $SESSION_NAME:main.1 -T "Agent 1"
tmux select-pane -t $SESSION_NAME:main.2 -T "Agent 2"
tmux select-pane -t $SESSION_NAME:main.3 -T "Agent 3"

# Set working directory for all panes
tmux send-keys -t $SESSION_NAME:main.0 "cd $(pwd)" C-m
tmux send-keys -t $SESSION_NAME:main.1 "cd $(pwd)" C-m
tmux send-keys -t $SESSION_NAME:main.2 "cd $(pwd)" C-m
tmux send-keys -t $SESSION_NAME:main.3 "cd $(pwd)" C-m

# Attach to the session
echo "Starting Claude Squad session..."
tmux attach-session -t $SESSION_NAME