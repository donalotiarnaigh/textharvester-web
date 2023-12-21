export OPENAI_API_KEY='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'

if which rbenv > /dev/null; then eval "$(rbenv init -)"; fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion


# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/danieltierney/Downloads/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/danieltierney/Downloads/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/danieltierney/Downloads/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/danieltierney/Downloads/google-cloud-sdk/completion.zsh.inc'; fi
