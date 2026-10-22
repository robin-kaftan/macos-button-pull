# macos-button-pull
### Brought to you by yours truly, Robin Kaftan.

If you want to see the live demo(s) then check out the [link](https://robin-kaftan.github.io/macos-button-pull/) here to see it in action.

I've tried my best to make it as easy to modify, by using data- javascript thingies. Very easy to use.

### How does it work?
It works the same way as the traffic light styled window action buttons on MacOS 27. You can click and drag on the affected buttons to make them stretch and bounce back like a spring.

You can use this on any HTML element (to my understanding) by adding these tags.

data-tug="true" -- This one is **required** for the stretching to work. You can dynamically set this to "false" to disable (or anything else, really.)

data-tug-move="5" -- This one is the maximum distance it can move away from it's origin point, measured in px.

data-tug-scale="1.3" -- This one is the maximum stretch scale, measured in multiple of initial scale.

data-tug-diag="1.1" -- This one is the maximum stretch scale when multiple axises are pulled on at the same time, measured in multiple of initial scale.

data-tug-pull="0.5" -- This one is how eagerly the stretch will follow the mouse. Lower values means slower moving, you have to drag your mouse more.


### Can I use it on my website?
Yes! This is completely open source, you can put this on your website! Credits are optional, but I would greatly respect whoever does put them.

### How can I use this on my website?
Simply paste this line into your `<head>`:

`<script defer src="https://robin-kaftan.github.io/macos-button-pull/"></script>`

Then, add those data- values from above to your desired elements, and you're done!
