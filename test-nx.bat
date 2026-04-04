@echo off
set NX_NO_CLOUD=true
set NX_INTERACTION=false
npx nx build @lobechat/database --skip-nx-cache=false
