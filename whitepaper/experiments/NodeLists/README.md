## Display property

* For blocks, the default width is 100% and the default height is 0.
A block does not share the line with other (sibling?) boxes.
This is the default.

* Inline boxes expand horizontally and vertically to contain their child nodes.

* An inline-block can have height and width and can share
the line with other boxes.

## Position property

* <em>static</em> means "in the flow, taking a place on the row"; the default

* <em>relative</em> means "in the flow, but can be displaced relative from
where it would have been with <em>right</em>, <em>top</em>, etc. set to 0"

* <em>absolute</em> means "out of the flow, not taking a place on the row,
displaced from its nearest ancestor that is relative or absolute",
display forced to block type

* <em>fixed</em> means "out of the flow, not taking a place on the row,
displaced from the window", display forced to block type

## Interactions

Interactions between *display* and *position* properties are shown in
[Dave Fisher's "CSS Display and Position property interactions"
video](https://youtu.be/juAquKMGUU0). This is not considering
the *float* or *z-axis* properties.