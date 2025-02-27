import { Component } from 'solid-js';

const About: Component = () => {
	const link = 'https://github.com/lumiknit/unhurry';
	return (
		<div class="container">
			<h1 class="title"> Unhurry </h1>
			<ul>
				<li>
					<b>Author</b>:
					<a href="https://github.com/lumiknit">
						lumiknit (aasr4r4@gmail.com)
					</a>
				</li>
				<li>
					<a href={link}>{link}</a>
				</li>
			</ul>
		</div>
	);
};

export default About;
