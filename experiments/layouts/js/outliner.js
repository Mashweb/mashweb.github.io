function outlineOneNode(node) {
    node.zen = {};
    node.zen.saveStyles = {};
    if (node.style !== undefined) {
	node.zen.saveStyles.border = node.style.border;
	if (node.style.border == "") {
	    node.style.border = "1px solid red";
	}
	node.zen.saveStyles.margin = node.style.margin;
	if (node.style.margin == "") {
	    node.style.margin = "1px";
	}
    }
}
