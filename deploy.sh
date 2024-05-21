#!/usr/bin/env bash

git_root=`git rev-parse --show-toplevel`
cd "$git_root"
./wxcli upload -v 1.0.0 -d "`date`"
