
import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import DockerManager from './dockerManager.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DockerAPI {
	constructor() {
		// if (DockerAPI._singleton)
		// 	throw new Error('DockerManager has been already initialized');
		// DockerAPI._singleton = extension;

		/**
		* Docker commands
		* @type {Array.<{label: string, command: string}>}
		*/
		DockerAPI._docker_commands = {
			// Service
			s_start: {
				label: _("Start docker"),
				command: "systemctl start docker"
			},
			s_running: {
				label: _("Check if running"),
				command: "systemctl is-active --quiet docker.socket"
			},
			// Container commands
			c_start: {
				label: _("Start"),
				command: "start"
			},
			c_start_i: {
				label: _("Start interactive"),
				command: "start -i"
			},
			c_restart: {
				label: _("Restart"),
				command: "restart"
			},
			c_stop: {
				label: _("Stop"),
				command: "stop"
			},
			c_pause: {
				label: _("Pause"),
				command: "pause"
			},
			c_unpause: {
				label: _("Unpause"),
				command: "unpause"
			},
			c_rm: {
				label: _("Remove"),
				command: "rm"
			},
			c_exec: {
				label: _("Exec Bash"),
				command: "exec -it"
			},
			c_attach: {
				label: _("Attach Terminal"),
				command: "attach"
			},
			c_inspect: {
				label: _("Inspect"),
				command: "inspect"
			},
			c_logs: {
				label: _("View logs"),
				command: "logs --tail 1000 -f"
			},

			compose_up: {
				label: _("Up"),
				command: "up -d"
			},
			compose_stop: {
				label: _("Stop"),
				command: "stop"
			},
			compose_rm: {
				label: _("Remove"),
				command: "down"
			},

			// Img commands
			i_rm: {
				label: _("Remove"),
				command: "rmi -f"
			},
			i_run: {
				label: _("Run"),
				command: "run --rm -d"
			},
			i_run_i: {
				label: _("Run interactive"),
				command: "run --rm -it"
			},
			i_inspect: {
				label: _("Inspect"),
				command: "inspect"
			}
		}

		DockerAPI.exec_communicate("which docker")
			.then((output) => {
				if (output.includes("snap")) {
					this._set_snaps();
				}
			})
			.catch((_err) => { });
	}

	_set_snaps() {
		DockerAPI._docker_commands.s_start.command = "pkexec snap start docker";
		DockerAPI._docker_commands.s_running.command = "systemctl is-active --quiet snap.docker.dockerd";
	}

	destroy() {
		DockerAPI._docker_commands = null;
	}

	static get docker_commands() {
		return DockerAPI._docker_commands;
	}

	/**
	 * Check if docker is installed
	 * @return {Boolean}
	 */
	static is_docker_installed() {
		return !!GLib.find_program_in_path('docker');
	}

	/**
	 * Check if docker-compose is installed
	 * @return {Boolean}
	 */
	static is_docker_compose_installed() {
		return !!GLib.find_program_in_path('docker-compose');
	}

	/**
	 * Check if docker service is running
	 * @return {Promise<Boolean>} whether docker service is running or not
	 */
	static async is_docker_running() {
		let is_running = false;

		await this.exec_communicate(this._docker_commands.s_running.command)
			.then(() => { is_running = true })
			.catch((_err) => { });

		return is_running;
	}

	/**
	 * Get docker version
	 * @return {Promise<Number>}
	 */
	static async docker_version() {
		let version = 0;
		await this.exec_communicate(`docker --version`)
			.then((output) => { version = +output.split(' ')[2].split('.')[0]; })
			.catch((_err) => { });

		return version;
	}

	/**
	 * Get total number of containers running-
	 * @return {Promise<string>}
	 */
	static async get_containers_running() {
		let out = "";

		await this.exec_communicate("docker ps -q -f status=running")
			.then((output) => { out += output.split("\n").filter((i) => i !== "").length; })
			.catch((_err) => { });

		return out;
	}


	/**
	 * Return containers name and status.
	 * @return {Promise<Array.<{
	 * id: String,
	 * name: String,
	 * state: String,
	 * ip: String,
	 * ip_prefix: String,
	 * gateway: String,
	 * ports: String,
	 * compose_project: String,
	 * compose_dir: String}>>} every object represents a container
	 */
	static async get_containers() {
		let out = "";
		await this.exec_communicate("docker ps -aq")
			.then((output) => { out = output })
			.catch((err) => {
				Main.notifyError(`Docker ERROR`, err.toString());
			});

		if (!out.length) {
			return [];
		}

		await this.exec_communicate(`docker inspect --format '{{json .}}' `.concat(out))
			.then((output) => { out = output })
			.catch((err) => {
				Main.notifyError(`Docker ERROR`, err.toString());
			});

		// Found containers
		return out
			.split("\n")
			.map(container => {
				container = JSON.parse(container);

				let ip, gateway, ip_prefix = "";
				if (container.NetworkSettings && container.NetworkSettings.Networks) {
					ip = container.NetworkSettings.Networks[Object.keys(container.NetworkSettings.Networks)[0]].IPAddress;
					ip_prefix = container.NetworkSettings.Networks[Object.keys(container.NetworkSettings.Networks)[0]].IPPrefixLen;
					gateway = container.NetworkSettings.Networks[Object.keys(container.NetworkSettings.Networks)[0]].Gateway;
				}

				return {
					id: container.Id,
					name: container.Name.slice(1),
					state: container.State.Status,
					ip: ip,
					ip_prefix: ip_prefix,
					gateway: gateway,
					ports: container.HostConfig.PortBindings,
					compose_project: container.Config.Labels['com.docker.compose.project'],
					compose_dir: container.Config.Labels['com.docker.compose.project.working_dir']
				};
			})
			.sort((a, b) => {
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;
				// equal name
				return 0;
			});
	}

	/**
	 * Return containers name and status.
	 * @return {Promise<Array.<{id: String, name: String}>>} every object represents a container
	 */
	static async get_images() {
		let out = "";
		await this.exec_communicate(`docker images --filter dangling=false --format "{{.ID}};{{.Repository}};{{.Tag}}"`)
			.then((output) => { out = output })
			.catch((err) => {
				Main.notifyError(`Docker ERROR`, err.toString());
			});

		if (!out.length) {
			return [];
		}

		// Found containers
		return out
			.replaceAll("\"", "")
			.split("\n")
			.filter(element => element)
			.map(str => str.split(";"))
			.map(s => {
				return {
					id: s[0],
					name: `${s[1]}:${s[2]}`
				};
			})
			.sort((a, b) => {
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;
				// equal name
				return 0;
			});

	}

	/**
	 * Run docker command.
	 * @param {docker_commands} command - name of command from the list docker_commands
	 * @param {Object} item - container/image struct
	 */
	static async run_command(command, item) {
		const Settings = DockerManager.settings;
		let c = "";
		switch (command) {
			// TODO: Make text to be translated
			case this.docker_commands.s_start:
				c = command.command;
				item = { name: "" };
				break;
			case this.docker_commands.c_exec:
				c = `${Settings.get_string('terminal')} 'docker ${command.command} ${item.id} bash; read -p "Press enter to exit..."'`;
				GLib.spawn_command_line_async(c);
				return;
			case this.docker_commands.c_attach:
				c = `${Settings.get_string('terminal')} 'docker ${command.command} ${item.id}; read -p "Press enter to exit..."'`;
				GLib.spawn_command_line_async(c);
				return;

			case this.docker_commands.c_start_i:
			case this.docker_commands.c_inspect:
			case this.docker_commands.c_logs:
			case this.docker_commands.i_inspect:
			case this.docker_commands.i_run_i:
				c = `${Settings.get_string('terminal')} 'docker ${command.command} ${item.id}; read -p "Press enter to exit..."'`;
				GLib.spawn_command_line_async(c);
				return;

			case this.docker_commands.compose_up:
			case this.docker_commands.compose_stop:
			case this.docker_commands.compose_rm:
				if (GLib.chdir(item.compose_dir) !== 0) {
					return;
				}

				if (await this.docker_version() >= 26) {
					c = `docker compose ${command.command}`;
					break;
				}

				c = `docker-compose ${command.command}`;
				break;

			default:
				c = `docker ${command.command} ${item.id}`;
		}

		let subProcess = Gio.Subprocess.new(
			c.split(" "),
			Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
		);

		subProcess.communicate_utf8_async(null, null, (proc, res) => {
			try {
				let [, , stderr] = proc.communicate_utf8_finish(res);

				if (!proc.get_successful()) {
					throw new Error(stderr);
				}

				Main.notify(`${command.label}`, item.name);
			} catch (e) {
				Main.notifyError('Docker ERROR', e.toString());
			}
		});
	}

	/**
	 * Execute a command asynchronously and return the output from `stdout` on
	 * success or throw an error with output from `stderr` on failure.
	 *
	 * If given, @input will be passed to `stdin` and @cancellable can be used to
	 * stop the process before it finishes.
	 *
	 * @param {string[]} argv - a list of string arguments
	 * @param {string} [input] - Input to write to `stdin` or %null to ignore
	 * @param {Gio.Cancellable} [cancellable] - optional cancellable object
	 * @returns {Promise<string>} - The process output
	 */
	static exec_communicate(argv, input = null, cancellable = null) {
		let cancelId = 0;
		let flags = (Gio.SubprocessFlags.STDOUT_PIPE |
			Gio.SubprocessFlags.STDERR_PIPE);

		if (input !== null)
			flags |= Gio.SubprocessFlags.STDIN_PIPE;

		const [, argv_split] = GLib.shell_parse_argv(argv);
		let subProcess = new Gio.Subprocess({
			argv: argv_split,
			flags: flags
		});
		subProcess.init(cancellable);

		if (cancellable instanceof Gio.Cancellable) {
			cancelId = cancellable.connect(() => subProcess.force_exit());
		}

		return new Promise((resolve, reject) => {
			subProcess.communicate_utf8_async(input, null, (proc, res) => {
				try {
					let [, stdout, stderr] = proc.communicate_utf8_finish(res);
					let status = proc.get_exit_status();

					if (status !== 0) {
						throw new Gio.IOErrorEnum({
							code: Gio.io_error_from_errno(status),
							message: stderr ? stderr.trim() : GLib.strerror(status)
						});
					}

					resolve(stdout.trim());
				} catch (e) {
					// console.error("Fail to execute command: ", argv); // debug
					reject(e);
				} finally {
					if (cancelId > 0) {
						cancellable.disconnect(cancelId);
					}
				}
			});
		});
	}
}
