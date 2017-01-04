cd $1
git for-each-ref --format='%(refname:short)' refs/heads/arcpatch* | while read branch; do    BRANCH_EXISTS=$( git ls-remote --heads origin $branch | wc -l );    if [ $BRANCH_EXISTS -eq 0 ]; then        git branch -D $branch;    fi;done
